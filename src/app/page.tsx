import { Hero } from "@/features/hero/Hero";
import { HowIWork } from "@/features/home/HowIWork";
import { LabTeaser } from "@/features/home/LabTeaser";
import { WorkTeaser } from "@/features/home/WorkTeaser";

/**
 * Home: who she is (her character, her name, the way in, the four products), then the work with
 * real screens, how she works, and a door to the lab. Contact is the footer.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <WorkTeaser />
      <HowIWork />
      <LabTeaser />
    </>
  );
}
