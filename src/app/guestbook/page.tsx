import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { GuestbookWall } from "@/features/guestbook/GuestbookWall";

export const metadata: Metadata = pageMeta({
  title: "Guestbook",
  description: "Leave a note for Adelia Tiara and the next visitor. New notes appear for everyone on the wall, live.",
  path: "/guestbook",
});

export default function GuestbookPage() {
  return (
    <PageTransition>
      <PageHeader
        id="guestbook-title"
        label="Guestbook"
        title={
          <>
            Sign the <span className="sticker-text">wall</span>.
          </>
        }
        lead="Leave a note for me and for whoever visits next. New notes show up for everyone here, live."
      />
      <div className="container-page section-y">
        <GuestbookWall />
      </div>
    </PageTransition>
  );
}
