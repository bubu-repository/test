import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Four products by Adelia Tiara";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "Selected work", title: "Three products, shipped end to end.", accent: "end to end", subtitle: "Tenderlens, Catat and Lintas: case studies you can read as an article or chat through." });
}
