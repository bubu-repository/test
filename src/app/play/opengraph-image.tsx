import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Context Window, a mini-game";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ eyebrow: "A mini-game", title: "Context Window", subtitle: "Snake, but you're an LLM. Eat tokens, summarise, don't hallucinate." });
}
