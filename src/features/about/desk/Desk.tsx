"use client";

import { IdBadge } from "@/features/hero/IdBadge";
import { Aquarium } from "./Aquarium";
import { DeskLaptop } from "./DeskLaptop";
import { Dac, Monitor } from "./MusicRig";
import { JellyKeychain, SealClock, WhalePlush } from "./Trinkets";

/**
 * Her desk, in 2.5D: a glossy white desk standing at the edge of the world's sea, the horizon
 * along its back edge (on phones, a frosted glass shelf in the water). On it: the monitor (YouTube plays on it from the DAC), her ID card hanging off the
 * monitor, the DAC, her laptop (it opens to a small desktop), the aquarium (the door to the
 * guestbook), a seal-pup desk clock on Bekasi time, a whale plush and a jellyfish keychain.
 * On wide screens it is one scene; on phones the same things stand in a column, so every control
 * keeps a usable size and the player stays at least 200 × 200 px.
 */
export function Desk() {
  return (
    <section id="desk" aria-label="Her desk" className="desk-wrap scroll-mt-24" data-xr="Desk · 2.5D scene: window, monitor, DAC, laptop, aquarium">
      <div className="desk">
        {/* The desk's back edge is the waterline: the sky behind it, the sea below. */}
        <div className="desk__top" aria-hidden="true" data-waterline="2" />

        <div className="desk__item desk__item--tank">
          <Aquarium />
        </div>
        <div className="desk__item desk__item--whale">
          <WhalePlush />
        </div>
        <div className="desk__item desk__item--monitor">
          <Monitor>
            <span className="desk__jelly">
              <JellyKeychain />
            </span>
            <div className="desk__badge">
              <IdBadge strap={46} />
            </div>
          </Monitor>
        </div>
        <div className="desk__item desk__item--clock">
          <SealClock />
        </div>
        <div className="desk__item desk__item--dac">
          <Dac />
        </div>
        <div className="desk__item desk__item--laptop">
          <DeskLaptop />
        </div>
      </div>
      <p className="desk__caption">Press play on the DAC, open the laptop, or tap the aquarium to visit the guestbook.</p>
    </section>
  );
}
