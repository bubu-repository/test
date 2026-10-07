import type { MetadataRoute } from "next";
import { description, identity } from "@/content/profile";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${identity.name}, ${identity.role}`,
    short_name: identity.domain,
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
