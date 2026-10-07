import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "The lab: experiments by Adelia Tiara";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "The lab", title: "Toys, tools and experiments.", accent: "experiments", subtitle: "Five experiments on their own subdomains, and more built into adelia.cc." });
}
