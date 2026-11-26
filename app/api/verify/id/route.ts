import { NextResponse } from "next/server";
import { mapleradReady, upgradeTier2, type IdType } from "@/lib/cards/maplerad";
import { adminClient, userClient } from "@/lib/server-supabase";

const TYPES: IdType[] = ["NIN", "PASSPORT", "DRIVERS_LICENSE", "VOTERS_CARD"];
const BUCKET = "flowvault-kyc"; // private: only the server can read it

/** Step 2 of the ID check (Maplerad "tier 2"): an ID document photo and a selfie. */
export async function POST(req: Request) {
  const sb = await userClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (!mapleradReady()) return NextResponse.json({ error: "Real cards aren't switched on yet" }, { status: 409 });

  const f = (await req.json().catch(() => ({}))) as { idType?: string; idNumber?: string; idImage?: string; selfie?: string };
  if (!TYPES.includes(f.idType as IdType)) return NextResponse.json({ error: "Pick your ID type" }, { status: 400 });
  if (!f.idNumber?.trim()) return NextResponse.json({ error: "Enter the number on your ID" }, { status: 400 });
  const img = (d?: string) => /^data:image\/(jpeg|png);base64,/.test(d ?? "") ? Buffer.from(d!.split(",")[1], "base64") : null;
  const idImg = img(f.idImage), selfie = img(f.selfie);
  if (!idImg || !selfie) return NextResponse.json({ error: "Add a photo of your ID and a selfie" }, { status: 400 });
  if (idImg.length > 4e6 || selfie.length > 4e6) return NextResponse.json({ error: "Photos are too large" }, { status: 400 });

  const admin = adminClient();
  const { data: cust } = await admin.rpc("fv_server_customer2", { p_user: user.id }).maybeSingle<{ customer_id: string | null }>();
  if (!cust?.customer_id) return NextResponse.json({ error: "Do the BVN step first" }, { status: 409 });

  try {
    // Maplerad wants links to the photos: store them privately and hand over links that expire in 7 days.
    const stamp = Date.now();
    const put = async (name: string, buf: Buffer) => {
      const path = `${user.id}/${name}-${stamp}.jpg`;
      const up = await admin.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw up.error;
      const signed = await admin.storage.from(BUCKET).createSignedUrl(path, 7 * 24 * 3600);
      if (signed.error || !signed.data) throw signed.error ?? new Error("No link");
      return signed.data.signedUrl;
    };
    const [idUrl, selfieUrl] = await Promise.all([put("id", idImg), put("selfie", selfie)]);
    await upgradeTier2(cust.customer_id, { type: f.idType as IdType, number: f.idNumber.trim(), imageUrl: idUrl }, selfieUrl);
    const { error } = await admin.rpc("fv_server_set_tier", { p_user: user.id, p_tier: 2 });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = (e as { providerMessage?: string }).providerMessage;
    return NextResponse.json({ error: msg ? `Maplerad said: ${msg}` : "Couldn't finish the ID check. Please try again." }, { status: 502 });
  }
}
