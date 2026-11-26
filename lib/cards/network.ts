/** Visa or Mastercard from the card number (BIN): 4 = Visa, 51-55 or 2221-2720 = Mastercard. Null if unknown. */
export function networkFromPan(pan: string | undefined | null): "Visa" | "Mastercard" | null {
  const d = (pan ?? "").replace(/\D/g, "");
  if (d.startsWith("4")) return "Visa";
  const n2 = Number(d.slice(0, 2)), n4 = Number(d.slice(0, 4));
  if ((n2 >= 51 && n2 <= 55) || (n4 >= 2221 && n4 <= 2720)) return "Mastercard";
  return null;
}
