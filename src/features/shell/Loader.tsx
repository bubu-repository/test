"use client";

import { useEffect, useState } from "react";
import { SiteAvatar } from "@/components/SiteAvatar";
import { finishLoader } from "@/lib/preferences";

const MAX_MS = 1000;

/**
 * The loading screen: once per session, for at most a second, while the fonts arrive. It is in the
 * server HTML so it covers the first paint; the init script in <head> hides it before paint for
 * repeat views, reduced motion and links straight into a case study, and it never shows without
 * JavaScript. Press Skip (or any key) to go straight in.
 */
export function Loader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (document.documentElement.getAttribute("data-loader") !== "run") return;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setDone(true);
      window.setTimeout(finishLoader, 260); // let the bar fill and the screen fade
    };
    const timer = window.setTimeout(finish, MAX_MS);
    void document.fonts?.ready.then(() => window.setTimeout(finish, 350));
    const onKey = () => finish();
    window.addEventListener("keydown", onKey, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="loader" data-done={done || undefined} role="status" aria-live="polite">
      <div className="loader__inner">
        <SiteAvatar size={72} />
        <p className="loader__name">
          adelia<span className="text-accent">.</span>cc
        </p>
        <span className="loader__bar" aria-hidden="true">
          <span />
        </span>
        <span className="sr-only">Loading</span>
        <button type="button" className="loader__skip" onClick={() => finishLoader()}>
          Skip
        </button>
      </div>
    </div>
  );
}
