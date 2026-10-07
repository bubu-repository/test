import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "The adelia.cc guestbook";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "Guestbook", title: "Sign the wall.", accent: "wall", subtitle: "Leave a note for Adelia and the next visitor. New notes appear live." });
}
