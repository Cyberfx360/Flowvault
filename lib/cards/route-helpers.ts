import "server-only";
import { NextResponse } from "next/server";
import { userClient } from "@/lib/server-supabase";

export type CardRef = { provider: string; provider_ref: string | null; status: string };

/** Signed-in user + their card for one subscription, or an error response. */
export async function load(subId: string) {
  const sb = await userClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Please sign in again" }, { status: 401 }) } as const;
  const { data: card } = await sb.rpc("fv_card_ref", { p_subscription: subId }).maybeSingle<CardRef>();
  if (!card) return { error: NextResponse.json({ error: "Card not found" }, { status: 404 }) } as const;
  return { sb, user, card } as const;
}

export const fail = (e: unknown, status = 502) => {
  console.error(e);
  return NextResponse.json({ error: "The card company didn't respond. Please try again." }, { status });
};
