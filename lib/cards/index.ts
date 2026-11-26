import "server-only";
import { mockProvider } from "./mock";
import { maplerad } from "./maplerad";

/** Which card company the server talks to. Set CARD_PROVIDER=maplerad on Render once you have keys. */
export const providerName = (process.env.CARD_PROVIDER === "maplerad" ? "maplerad" : "mock") as "mock" | "maplerad";
export const provider = providerName === "maplerad" ? maplerad : mockProvider;
export { maplerad };
