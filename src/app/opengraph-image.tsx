import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Adelia Tiara, Product Designer for AI products in Bekasi, Indonesia";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "Product Designer · AI products", title: "Adelia Tiara", subtitle: "I design AI products people can trust, from the first interview to the shipped interface." });
}
