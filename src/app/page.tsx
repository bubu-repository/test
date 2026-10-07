import { HeroDevice } from "@/features/hero/HeroDevice";
import { HeroStage } from "@/features/hero/HeroStage";
import { HowIWork } from "@/features/home/HowIWork";
import { LabTeaser } from "@/features/home/LabTeaser";
import { WorkTeaser } from "@/features/home/WorkTeaser";

/**
 * Home: who she is (the device, in a window onto the sky), then the work with real screens, how
 * she works, and a door to the lab. Contact is the footer. The toys live in the lab.
 */
export default function HomePage() {
  return (
    <>
      <HeroStage>
        <HeroDevice />
      </HeroStage>
      <WorkTeaser />
      <HowIWork />
      <LabTeaser />
    </>
  );
}
