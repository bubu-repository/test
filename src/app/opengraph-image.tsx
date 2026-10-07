import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Adelia Tiara, AI Product Engineer in Bekasi, Indonesia";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "AI Product Engineer", title: "Adelia Tiara", subtitle: "I build AI products end to end, from the interface to the agents behind it." });
}
