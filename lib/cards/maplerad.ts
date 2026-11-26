import "server-only";
import crypto from "node:crypto";
import type { CardProvider } from "./types";

/**
 * Maplerad card provider (https://maplerad.dev/docs/issuing). SERVER ONLY: the secret key never
 * reaches the browser.
 *
 * Checked against the docs on 26 Nov 2026. Things the docs don't spell out are marked VERIFY and
 * must be confirmed in the Maplerad sandbox before going live.
 *
 * Facts that shape Flowvault:
 * - Cards are USD Visa/Mastercard only. Naira-priced services (DStv, GOtv…) get a USD card too,
 *   and the bank converts, so ask Maplerad about cross-border and FX fees.
 * - Cards are prepaid: money must be put on a card (fund) before a company can charge it.
 * - Creating a card is asynchronous: we get a tracking reference now and the card later via the
 *   "issuing.created.successful" webhook (see app/api/webhooks/maplerad).
 * - Live mode only accepts calls from whitelisted server IPs (see README, "IP whitelisting").
 */
const BASE = process.env.MAPLERAD_BASE_URL || "https://api.maplerad.com/v1";

async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.MAPLERAD_SECRET_KEY;
  if (!key) throw new Error("MAPLERAD_SECRET_KEY is not set");
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: { status?: boolean; message?: string; data?: unknown } = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* not JSON */ }
  if (!res.ok || json.status === false) {
    const hint = res.status === 403 ? " (is this server's IP whitelisted at Maplerad?)" : "";
    const err = new Error(`Maplerad ${method} ${path} failed: ${res.status} ${json.message ?? text.slice(0, 200)}${hint}`) as Error & { providerMessage?: string };
    err.providerMessage = (json.message ?? "").slice(0, 300) + hint;
    throw err;
  }
  return (json.data ?? json) as T;
}

/** Maplerad needs a customer before it issues cards. Full enrollment needs KYC (BVN, date of birth, phone, address). */
export type KycDetails = {
  firstName: string; lastName: string; email: string; bvn: string; dob: string; // "20-10-1988"
  phone: { phone_country_code: string; phone_number: string }; // VERIFY field names
  address: { street: string; city: string; state: string; country: string; postal_code: string }; // VERIFY
};
export async function enrollCustomer(k: KycDetails): Promise<string> {
  const data = await call<{ id?: string; customer_id?: string }>("POST", "/customers/enroll", {
    first_name: k.firstName, last_name: k.lastName, email: k.email, country: "NG",
    identification_number: k.bvn, dob: k.dob, phone: k.phone, address: k.address,
  });
  const id = data.id ?? data.customer_id; // VERIFY which field holds the id
  if (!id) throw new Error("Maplerad didn't return a customer id");
  return id;
}

export type IdType = "NIN" | "PASSPORT" | "DRIVERS_LICENSE" | "VOTERS_CARD";
/** Tier 2: an ID document plus a selfie. Maplerad only makes cards for tier 2 customers. */
export async function upgradeTier2(customerId: string, id: { type: IdType; number: string; imageUrl: string }, selfieUrl: string) {
  await call("PATCH", "/customers/upgrade/tier2", {
    customer_id: customerId,
    identity: { type: id.type, image: id.imageUrl, number: id.number, country: "NG" },
    photo: selfieUrl,
  });
}

export const maplerad: CardProvider & {
  requestCard(customerId: string, brand?: "VISA" | "MASTERCARD"): Promise<string>;
  lookup(idOrRef: string): Promise<{ id: string; last4: string; network: string } | null>;
  fund(cardId: string, cents: number): Promise<void>;
} = {
  name: "maplerad",

  /** Starts card creation and returns Maplerad's tracking reference. The card arrives by webhook. */
  async requestCard(customerId, brand = "VISA") {
    const data = await call<Record<string, unknown>>("POST", "/issuing", {
      customer_id: customerId, currency: "USD", type: "VIRTUAL", auto_approve: true, brand,
      amount: 200, // first funding in cents; Maplerad's default
    });
    const card = (data.card ?? {}) as Record<string, unknown>;
    const ref = data.reference ?? data.id ?? card.reference ?? card.id; // VERIFY in sandbox
    if (typeof ref !== "string" || !ref) {
      const err = new Error("Maplerad didn't return a card reference: " + JSON.stringify(data).slice(0, 300)) as Error & { providerMessage?: string };
      err.providerMessage = "unexpected reply " + JSON.stringify(data).slice(0, 200);
      throw err;
    }
    return ref;
  },

  async createCard() {
    throw new Error("Maplerad cards are created in the background: use requestCard() and the webhook");
  },

  /** Looks a card up by its id or tracking reference (Maplerad accepts either). Used when a webhook is late or missing. */
  async lookup(idOrRef: string) {
    const c = await call<{ id?: string; masked_pan?: string; card_number?: string; issuer?: string; brand?: string; status?: string }>("GET", `/issuing/${idOrRef}`);
    const pan = c.masked_pan ?? c.card_number;
    if (!c.id || !pan) return null;
    return { id: c.id, last4: pan.slice(-4), network: (c.issuer ?? c.brand) === "MASTERCARD" ? "Mastercard" : "Visa" };
  },

  async fund(cardId, cents) { await call("POST", `/issuing/${cardId}/fund`, { amount: cents }); },
  async freeze(cardId) { await call("PATCH", `/issuing/${cardId}/freeze`); },
  async unfreeze(cardId) { await call("PATCH", `/issuing/${cardId}/unfreeze`); },
  async terminate(cardId) { await call("PUT", `/issuing/${cardId}/terminate`); },

  async reveal(cardId) {
    // VERIFY: the docs don't list the fields GET /issuing/{id} returns. These names are the likely ones.
    const c = await call<Record<string, string | undefined>>("GET", `/issuing/${cardId}`);
    const pan = c.card_number ?? c.pan ?? c.number;
    const cvv = c.cvv ?? c.cvv2;
    if (!pan || !cvv) throw new Error("Maplerad didn't return the card details");
    return { pan, cvv };
  },
};

/**
 * Checks a webhook really came from Maplerad (Svix-style signature, per maplerad.dev/docs/verifying-webhooks).
 * Signed text is `${svix-id}.${svix-timestamp}.${raw body}`, HMAC-SHA256 with the base64 part of the whsec_ secret.
 */
export function verifyWebhook(headers: Headers, rawBody: string, toleranceSec = 300): boolean {
  const secret = process.env.MAPLERAD_WEBHOOK_SECRET?.trim();
  // No whsec_ signing secret from Maplerad? Then only accept calls from Maplerad's published webhook IPs.
  if (!secret || !secret.startsWith("whsec_")) return fromMapleradIp(headers);
  const id = headers.get("svix-id"), ts = headers.get("svix-timestamp"), sigs = headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > toleranceSec) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest();
  return sigs.split(" ").some((part) => {
    const [ver, sig] = part.split(",");
    if (ver !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

/** Maplerad's webhook sender IPs, from maplerad.dev/docs/verifying-webhooks (Nov 2026). */
const MAPLERAD_IPS = new Set([
  "54.216.8.72", "54.173.54.49", "52.215.16.239", "52.55.123.25", "52.6.93.106",
  "63.33.109.123", "44.228.126.217", "50.112.21.217", "52.24.126.164", "54.148.139.208",
]);
function fromMapleradIp(headers: Headers): boolean {
  // Render sits behind Cloudflare, which sets these headers itself (callers can't fake them).
  // X-Forwarded-For is NOT used: a caller can put any address in it.
  const ip = (headers.get("cf-connecting-ip") || headers.get("true-client-ip") || "").trim();
  return MAPLERAD_IPS.has(ip);
}

/** True when the server has Maplerad keys, so verified users can get real (sandbox) cards. */
export const mapleradReady = () => !!process.env.MAPLERAD_SECRET_KEY;
