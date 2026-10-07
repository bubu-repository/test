import type { MetadataRoute } from "next";
import { identity } from "@/content/profile";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/styleguide"] }],
    sitemap: `${identity.url}/sitemap.xml`,
    host: identity.url,
  };
}
