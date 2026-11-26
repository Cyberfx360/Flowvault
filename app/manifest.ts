import type { MetadataRoute } from "next";

// Lets people add Flowvault to their phone's home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flowvault",
    short_name: "Flowvault",
    description: "One card for every subscription.",
    start_url: "/home",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#141614",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
