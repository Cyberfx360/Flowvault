// Finds a company's website (and brand colour) from the name someone types, so we can show its logo.
// Known services are listed below; for anything else we guess "<name>.com".

type Brand = { names: string[]; domain: string; color: string };

const BRANDS: Brand[] = [
  // Streaming & TV
  { names: ["netflix"], domain: "netflix.com", color: "#b1060f" },
  { names: ["dstv"], domain: "dstv.com", color: "#0a4ea2" },
  { names: ["gotv"], domain: "gotvafrica.com", color: "#2a9d3a" },
  { names: ["showmax"], domain: "showmax.com", color: "#6b2fa3" },
  { names: ["startimes"], domain: "startimes.com.ng", color: "#e30613" },
  { names: ["youtube", "youtube premium", "youtube music"], domain: "youtube.com", color: "#c4302b" },
  { names: ["prime video", "amazon prime", "prime"], domain: "primevideo.com", color: "#1a98ff" },
  { names: ["disney+", "disney plus", "disney"], domain: "disneyplus.com", color: "#0e3a8a" },
  { names: ["hbo max", "max"], domain: "max.com", color: "#002be7" },
  { names: ["paramount+", "paramount plus"], domain: "paramountplus.com", color: "#0064ff" },
  { names: ["apple tv", "apple tv+"], domain: "tv.apple.com", color: "#141614" },
  { names: ["crunchyroll"], domain: "crunchyroll.com", color: "#f47521" },
  { names: ["irokotv", "iroko"], domain: "irokotv.com", color: "#e4002b" },
  // Music
  { names: ["spotify"], domain: "spotify.com", color: "#1a7f45" },
  { names: ["apple music"], domain: "music.apple.com", color: "#fa243c" },
  { names: ["boomplay"], domain: "boomplay.com", color: "#1c1c1c" },
  { names: ["audiomack"], domain: "audiomack.com", color: "#ffa200" },
  { names: ["deezer"], domain: "deezer.com", color: "#a238ff" },
  { names: ["tidal"], domain: "tidal.com", color: "#141614" },
  // AI & work
  { names: ["chatgpt", "chat gpt", "openai"], domain: "openai.com", color: "#10a37f" },
  { names: ["claude", "anthropic"], domain: "claude.ai", color: "#d97757" },
  { names: ["midjourney"], domain: "midjourney.com", color: "#141614" },
  { names: ["gemini", "google one", "google"], domain: "one.google.com", color: "#4285f4" },
  { names: ["microsoft 365", "office 365", "microsoft"], domain: "microsoft.com", color: "#d83b01" },
  { names: ["canva"], domain: "canva.com", color: "#00c4cc" },
  { names: ["capcut"], domain: "capcut.com", color: "#141614" },
  { names: ["adobe", "photoshop", "premiere pro", "lightroom"], domain: "adobe.com", color: "#fa0f00" },
  { names: ["figma"], domain: "figma.com", color: "#a259ff" },
  { names: ["notion"], domain: "notion.so", color: "#141614" },
  { names: ["grammarly"], domain: "grammarly.com", color: "#15c39a" },
  { names: ["zoom"], domain: "zoom.us", color: "#0b5cff" },
  { names: ["dropbox"], domain: "dropbox.com", color: "#0061ff" },
  { names: ["linkedin", "linkedin premium"], domain: "linkedin.com", color: "#0a66c2" },
  { names: ["github", "github copilot", "copilot"], domain: "github.com", color: "#141614" },
  { names: ["duolingo"], domain: "duolingo.com", color: "#58cc02" },
  // Apple, social, gaming, internet
  { names: ["icloud", "icloud+"], domain: "icloud.com", color: "#3a6fd8" },
  { names: ["apple one", "apple"], domain: "apple.com", color: "#141614" },
  { names: ["x premium", "twitter", "x"], domain: "x.com", color: "#141614" },
  { names: ["telegram", "telegram premium"], domain: "telegram.org", color: "#26a5e4" },
  { names: ["snapchat", "snapchat+"], domain: "snapchat.com", color: "#fffc00" },
  { names: ["playstation plus", "ps plus", "playstation"], domain: "playstation.com", color: "#0070d1" },
  { names: ["xbox game pass", "game pass", "xbox"], domain: "xbox.com", color: "#107c10" },
  { names: ["starlink"], domain: "starlink.com", color: "#141614" },
  { names: ["mtn"], domain: "mtn.ng", color: "#ffcb05" },
  { names: ["airtel"], domain: "airtel.com.ng", color: "#e40000" },
  { names: ["glo"], domain: "gloworld.com", color: "#4caf50" },
  { names: ["spectranet"], domain: "spectranet.com.ng", color: "#e4002b" },
];

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9+ ]/g, "").replace(/\s+/g, " ").trim();

export function brandFor(name: string): { domain: string | null; color: string | null } {
  const n = clean(name);
  if (!n) return { domain: null, color: null };
  // Exact name first, then "starts with" (so "Netflix Premium" still finds Netflix).
  const exact = BRANDS.find((b) => b.names.includes(n));
  const hit = exact ?? BRANDS.find((b) => b.names.some((x) => x.length > 2 && (n.startsWith(x + " ") || n.startsWith(x + "+"))));
  if (hit) return { domain: hit.domain, color: hit.color };
  // Typed a website? Use it. Otherwise guess the first word + ".com".
  const typed = name.trim().toLowerCase().match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/);
  if (typed) return { domain: typed[1], color: null };
  const word = n.split(" ")[0].replace(/\+/g, "");
  return { domain: word.length >= 3 ? word + ".com" : null, color: null };
}

/** A logo image for a website, from Google's public icon service. */
export const logoUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
