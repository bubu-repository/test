import type { Metadata } from "next";
import { identity } from "@/content/profile";

/**
 * Full metadata for a page. Next.js replaces (rather than merges) a parent's openGraph and
 * twitter objects, so every page sets them completely. The share image comes from the
 * segment's opengraph-image.tsx.
 */
export function pageMeta({ title, description, path, type = "website" }: { title: string; description: string; path: string; type?: "website" | "article" }): Metadata {
  const full = `${title} — ${identity.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: identity.domain, locale: "en_US", url: path, title: full, description },
    twitter: { card: "summary_large_image", title: full, description },
  };
}
