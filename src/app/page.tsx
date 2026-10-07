import { HeroDevice } from "@/features/hero/HeroDevice";
import { HeroStage } from "@/features/hero/HeroStage";
import { TerminalSection } from "@/features/home/TerminalSection";
import { WorkTeaser } from "@/features/home/WorkTeaser";
import { WidgetBoard } from "@/features/widgets/WidgetBoard";

/**
 * Home: one device in the hero, then the rest of the world as you scroll: three booster packs of
 * work, the live board (Bekasi on a phone, the sea, a pocket console to take a break), and a laptop
 * with the terminal. The game itself lives on /play.
 */
export default function HomePage() {
  return (
    <>
      <HeroStage>
        <HeroDevice />
      </HeroStage>
      <WorkTeaser />
      <WidgetBoard />
      <TerminalSection />
    </>
  );
}
