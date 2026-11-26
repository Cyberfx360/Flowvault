import { NextResponse } from "next/server";
import { enrollCustomer, mapleradReady } from "@/lib/cards/maplerad";
import { adminClient, userClient } from "@/lib/server-supabase";

/** Is real-card verification switched on, and is this user verified? */
export async function GET() {
  const sb = await userClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (!mapleradReady()) return NextResponse.json({ available: false, verified: false });
  const { data } = await adminClient().rpc("fv_server_customer", { p_user: user.id }).maybeSingle<{ customer_id: string | null }>();
  return NextResponse.json({ available: true, verified: !!data?.customer_id });
}

/** ID check: registers the user with Maplerad (BVN, date of birth, phone, address). Nothing is stored except Maplerad's customer id. */
export async function POST(req: Request) {
  const sb = await userClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (!mapleradReady()) return NextResponse.json({ error: "Real cards aren't switched on yet" }, { status: 409 });

  const f = (await req.json().catch(() => ({}))) as Record<string, string>;
  const need = ["firstName", "lastName", "bvn", "dob", "phone", "street", "city", "state", "postalCode"];
  if (need.some((k) => !String(f[k] ?? "").trim())) return NextResponse.json({ error: "Please fill in every field" }, { status: 400 });
  if (!/^\d{11}$/.test(f.bvn)) return NextResponse.json({ error: "BVN must be 11 digits" }, { status: 400 });
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.dob);
  if (!m) return NextResponse.json({ error: "Enter your date of birth" }, { status: 400 });
  const phone = f.phone.replace(/\D/g, "").replace(/^234/, "").replace(/^0/, "");

  try {
    const id = await enrollCustomer({
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: user.email!, bvn: f.bvn, dob: `${m[3]}-${m[2]}-${m[1]}`,
      phone: { phone_country_code: "+234", phone_number: phone },
      address: { street: f.street.trim(), city: f.city.trim(), state: f.state.trim(), country: "NG", postal_code: f.postalCode.trim() },
    });
    const { error } = await adminClient().rpc("fv_server_set_customer", { p_user: user.id, p_customer_id: id });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = (e as { providerMessage?: string }).providerMessage;
    return NextResponse.json({ error: msg ? `Maplerad said: ${msg}` : "Couldn't verify right now. Please try again." }, { status: 502 });
  }
}
