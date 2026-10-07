import { HeroDesk } from "@/features/hero/HeroDesk";
import { HeroDevice } from "@/features/hero/HeroDevice";
import { WorkTeaser } from "@/features/home/WorkTeaser";
import { WidgetBoard } from "@/features/widgets/WidgetBoard";

export default function HomePage() {
  return (
    <>
      <HeroDesk>
        <HeroDevice />
      </HeroDesk>
      <WorkTeaser />
      <WidgetBoard />
    </>
  );
}
