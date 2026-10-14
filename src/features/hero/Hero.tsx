"use client";

import Link from "next/link";
import { ArrowRightIcon, CopyIcon, DownloadIcon } from "@/components/icons";
import { MociDrop } from "@/components/SiteAvatar";
import { identity } from "@/content/profile";
import { projects } from "@/content/projects";
import { dispatch } from "@/lib/actions";
import { useNow } from "@/lib/hooks";
import { formatTime } from "@/lib/time";
import { ProjectIcon } from "../work/ProjectIcon";
import { HeroName } from "./HeroName";
import { ResampleSentence } from "./ResampleSentence";

/** "Open to work · 14:02 in Bekasi": one fact and one clock (the visitor's clock and the weather live in the footer). */
function Status() {
  const now = useNow();
  const date = now ? new Date(now * 1000) : null;
  return (
    <p className="hero-status">
      <span className="led" aria-hidden="true" />
      <span>Open to work</span>
      <span aria-hidden="true">·</span>
      <span>
        <span className="hero-status__clock">{date ? formatTime(identity.timeZone, date) : "--:--"}</span> in {identity.city}
      </span>
    </p>
  );
}

/**
 * The hero, in the open sky of the world behind the page (World): her name, the role and the way in
 * sit in the deep sky; the four products float on the bank of cloud at the bottom of the first
 * screen with one number each, so the work is on the first screen on every device. The sky ends
 * (and the clouds close in) where the products start; under them the clouds turn to the white page.
 */
export function Hero() {
  return (
    <section id="hero" aria-labelledby="hero-name" className="hero">
      <div className="hero__window on-water">
        <div className="container-page">
          <div className="hero__copy">
            <div className="hero__words" data-sky-text>
              <Status />
              <div id="hero-name" className="mt-6">
                <HeroName />
              </div>
              <p className="hero__role">
                {identity.role}{" "}
                <span className="hero__cohort">
                  · {identity.cohort} · {identity.city}, remote or Jakarta
                </span>
              </p>
              <div className="hero__line">
                <ResampleSentence controls={false} quiet />
              </div>

              <div className="hero__keys">
                <Link href="/work" className="pill" data-variant="light" data-size="lg" data-tour="go">
                  Open the work
                  <ArrowRightIcon width={20} height={20} />
                </Link>
                <button
                  type="button"
                  className="pill"
                  data-size="lg"
                  onClick={() =>
                    void dispatch({
                      type: "download",
                      href: "/cv.pdf",
                      filename: "Adelia-Tiara-CV.pdf",
                    })
                  }
                >
                  <DownloadIcon width={18} height={18} /> CV
                </button>
                <button type="button" className="pill" data-size="lg" onClick={() => void dispatch({ type: "copyEmail" })}>
                  <CopyIcon width={18} height={18} /> Email
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Moci floats in the open sky beside the words (desktop): the site's guide, and a way to ask it. */}
        <button type="button" className="hero__moci" onClick={() => void dispatch({ type: "open", panel: "agent" })}>
          <span className="hero__moci-bob">
            <MociDrop size={140} />
          </span>
          <span className="hero__moci-bubble" aria-hidden="true" />
          <span className="hero__moci-bubble" aria-hidden="true" />
          <span className="hero__moci-bubble" aria-hidden="true" />
          <span className="hero__moci-tag">Ask Moci about her</span>
        </button>

        <div className="hero__clouds">
          <div className="container-page">
            <ul className="hero-work" aria-label="The work, with one number each" data-sky-end="1">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link href={`/work/${p.slug}`} className="hero-work__item">
                    <span className="hero-work__head">
                      <ProjectIcon project={p} size={30} />
                      <span className="hero-work__name">{p.name}</span>
                      <span className="hero-work__go" aria-hidden="true">
                        ›
                      </span>
                    </span>
                    <span className="hero-work__value">{p.stats[0].value}</span>
                    <span className="hero-work__label">{p.stats[0].label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
