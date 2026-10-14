import type { MetadataRoute } from "next";
import { identity } from "@/content/profile";
import { projects } from "@/content/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/work", ...projects.map((p) => `/work/${p.slug}`), "/lab", "/about", "/colophon", "/guestbook"];
  return pages.map((path) => ({
    url: `${identity.url}${path === "/" ? "" : path}`,
    changeFrequency: path === "/guestbook" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/work") ? 0.9 : 0.7,
  }));
}
