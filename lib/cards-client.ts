import type { CardDetails } from "@/lib/cards/types";
/** Browser side of the card routes in app/api/cards. Throws with a readable message on failure. */
async function post<T>(url: string, method = "POST", body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
  return json as T;
}
export const cardsApi = {
  power: (subId: string, on: boolean) => post(`/api/cards/${subId}/power`, "POST", { on }),
  reveal: (subId: string) => post<CardDetails & { test?: boolean }>(`/api/cards/${subId}/reveal`),
  issue: (subId: string, network?: "Visa" | "Mastercard") => post(`/api/cards/${subId}/issue`, "POST", network ? { network } : undefined),
  remove: (subId: string) => post(`/api/cards/${subId}`, "DELETE"),
};
