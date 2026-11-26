// Money is kept in kobo (₦1 = 100 kobo) and cents ($1 = 100 cents).
export const naira = (kobo: number) =>
  "₦" + Math.round(kobo / 100).toLocaleString("en-NG");

export const money = (minor: number, currency: "NGN" | "USD") =>
  currency === "USD" ? "$" + (minor / 100).toFixed(2).replace(/\.00$/, "") : naira(minor);

export const initials = (name: string) =>
  name.split(/\s|\+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** Next date this billing day comes round, from today. */
/**
 * Next billing date. A subscription added today whose billing day is today was already
 * billed today (before it had its Flowvault card), so its next charge is next month.
 */
export const nextCharge = (day: number, addedAt?: string, from = new Date()) => {
  const d = new Date(from.getFullYear(), from.getMonth(), day);
  const addedToday = !!addedAt && new Date(addedAt).toDateString() === from.toDateString();
  if (day < from.getDate() || (addedToday && day === from.getDate())) d.setMonth(d.getMonth() + 1);
  return d;
};

export const shortDate = (d: Date) =>
  d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });

export const dayLabel = (iso: string) => {
  const d = new Date(iso), today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const base = d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
  return same(d, today) ? "Today, " + shortDate(d) : same(d, y) ? "Yesterday, " + shortDate(d) : base;
};

export const COLORS = ["#b1060f", "#1a7f45", "#0a4ea2", "#2b2f2b", "#c4302b", "#3a6fd8", "#6b2fa3", "#565a55"];
