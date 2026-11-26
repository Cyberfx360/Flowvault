import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Sub = {
  id: string; name: string; plan: string; currency: "NGN" | "USD"; price_minor: number;
  billing_day: number; color: string; is_on: boolean; price_guard: boolean; remind: boolean; created_at: string;
};
export type Card = {
  holder_name: string; last4: string; exp_month: number; exp_year: number; network: string;
  frozen: boolean;
};
export type Txn = {
  id: string; kind: "topup" | "charge"; status: "success" | "declined"; amount_kobo: number;
  title: string; detail: string; subscription_id: string | null; created_at: string;
};
export type Profile = { full_name: string; phone: string | null };
