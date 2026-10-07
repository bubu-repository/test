import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Adelia Tiara, AI Product Engineer (Informatics, class of 2026) in Bekasi, Indonesia";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "AI Product Engineer · Class of 2026", title: "Adelia Tiara", subtitle: "I design and build AI products people can trust, from the first interview to the shipped code." });
}
