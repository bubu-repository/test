import { HeroDevice } from "@/features/hero/HeroDevice";
import { HeroStage } from "@/features/hero/HeroStage";
import { PlaySection } from "@/features/home/PlaySection";
import { TerminalSection } from "@/features/home/TerminalSection";
import { WorkTeaser } from "@/features/home/WorkTeaser";
import { WidgetBoard } from "@/features/widgets/WidgetBoard";

/**
 * Home: one device in the hero, then the rest of the world as you scroll: polaroids of the work,
 * live widgets (Bekasi on a phone), a PSP with the game, a laptop with the terminal.
 */
export default function HomePage() {
  return (
    <>
      <HeroStage>
        <HeroDevice />
      </HeroStage>
      <WorkTeaser />
      <WidgetBoard />
      <PlaySection />
      <TerminalSection />
    </>
  );
}
