import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { ContextWindow } from "@/features/play/ContextWindow";

export const metadata: Metadata = pageMeta({
  title: "Context Window",
  description: "Snake, but you're an LLM: eat tokens, summarise before you overflow, and don't hallucinate into yourself. A mini-game by Adelia Tiara.",
  path: "/play",
});

export default function PlayPage() {
  return (
    <PageTransition>
      <header className="container-page pt-36 text-center md:pt-44">
        <p className="type-eyebrow">A mini-game</p>
        <h1 className="type-display mx-auto mt-4 max-w-[14ch]">Context Window</h1>
        <p className="type-lead mx-auto mt-6 max-w-[42ch] text-muted">Snake, but you&apos;re an LLM. Read 20 tokens in one go for a sticker.</p>
      </header>
      <div className="container-page section-y">
        <ContextWindow />
      </div>
    </PageTransition>
  );
}
