import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { PixelMoci } from "@/features/objects/PixelMoci";
import { ContextWindow } from "@/features/play/ContextWindow";

export const metadata: Metadata = pageMeta({
  title: "Context Window",
  description: "Snake, but you're an LLM: eat tokens, summarise before you overflow, and don't hallucinate into yourself. A mini-game by Adelia Tiara.",
  path: "/play",
});

export default function PlayPage() {
  return (
    <PageTransition>
      <PageHeader
        id="play-title"
        label="A mini-game"
        title={
          <>
            Context <span className="sticker-text">Window</span>
          </>
        }
        lead="Snake, but you're an LLM, on a pocket console. Read 20 tokens in one go for a sticker."
      />
      <div className="container-page pt-14 pb-[clamp(96px,13vw,176px)] md:pt-20">
        <div className="mx-auto max-w-[1000px]">
          <ContextWindow variant="handheld" />
          <div className="psp-ground mt-10">
            <PixelMoci />
          </div>
          <p className="mt-6 text-center text-14 text-muted">Arrow keys or WASD steer, Space starts and pauses. On a phone, use the D-pad or swipe the screen.</p>
        </div>
      </div>
    </PageTransition>
  );
}
