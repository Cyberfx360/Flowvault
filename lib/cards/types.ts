/** What Flowvault needs from any card company. Swap providers by writing another file like maplerad.ts. */
export type IssuedCard = {
  providerRef: string; // the provider's id for the card
  last4: string;
  expMonth: number;
  expYear: number;
  network: string; // "Visa", "Mastercard"
};

export type NewCard = {
  subscriptionId: string;
  holderName: string;
  email: string;
  currency: "NGN" | "USD";
};

export interface CardProvider {
  name: "mock" | "maplerad";
  /** Creates a card for one subscription. */
  createCard(input: NewCard): Promise<IssuedCard>;
  /** Freezes a card so every charge on it is declined. */
  freeze(providerRef: string): Promise<void>;
  unfreeze(providerRef: string): Promise<void>;
  /** Full number and CVV, fetched only when the user taps "Show details". */
  reveal(providerRef: string): Promise<{ pan: string; cvv: string }>;
  /** Ends the card for good (when a subscription is removed). */
  terminate(providerRef: string): Promise<void>;
}
