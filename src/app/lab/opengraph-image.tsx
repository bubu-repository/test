import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "The lab: make something, take a card";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "The lab", title: "Make something. Take a card.", accent: "card", subtitle: "Your words or a photo in felt, jelly, chrome or acrylic, and one booster pack a day." });
}
