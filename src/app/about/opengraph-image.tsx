import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "About Adelia Tiara";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "About", title: "Hi, I'm Adelia.", accent: "Adelia", subtitle: "Story, model card, skills, a CV to download and a job-description matcher." });
}
