import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { GuestbookWall } from "@/features/guestbook/GuestbookWall";

export const metadata: Metadata = pageMeta({
  title: "Guestbook",
  description: "Leave a note for Adelia Tiara and the next visitor. New notes appear for everyone on the wall, live.",
  path: "/guestbook",
});

export default function GuestbookPage() {
  return (
    <PageTransition>
      <header className="container-page pt-36 text-center md:pt-44">
        <p className="type-eyebrow">Guestbook</p>
        <h1 className="type-display mx-auto mt-4 max-w-[14ch]">
          Sign the <span className="sticker-text">wall</span>.
        </h1>
        <p className="type-lead mx-auto mt-6 max-w-[42ch] text-muted">Leave a note for me and for whoever visits next. New notes show up for everyone here, live.</p>
      </header>
      <div className="container-page section-y">
        <GuestbookWall />
      </div>
    </PageTransition>
  );
}
