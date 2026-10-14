import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "The adelia.cc guestbook";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "Guestbook", title: "Leave a creature in the sea.", accent: "sea", subtitle: "Pick a sea creature, give it a note for Adelia and the next visitor, and let it swim." });
}
