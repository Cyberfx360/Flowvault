import type { CardProvider } from "./types";

/**
 * MOCK provider. In mock mode the database itself makes pretend cards (flowvault.issue_mock_card),
 * and freezing is just a flag in the database, so every call here is a no-op.
 */
export const mockProvider: CardProvider = {
  name: "mock",
  async createCard() { throw new Error("Mock cards are created by the database"); },
  async freeze() {},
  async unfreeze() {},
  async reveal() { throw new Error("Mock card details come from the database"); },
  async terminate() {},
};
