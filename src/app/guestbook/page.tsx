import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { GuestbookSea } from "@/features/guestbook/GuestbookSea";

export const metadata: Metadata = pageMeta({
  title: "Guestbook",
  description: "Leave a sea creature with a note for Adelia Tiara and the next visitor. It swims in the guestbook's sea for everyone, live.",
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
            Leave a creature in the <span className="sticker-text">sea</span>.
          </>
        }
        lead="Pick a sea creature and a colour, give it a line for me and whoever visits next, and let it go. It swims here with everyone else's. Tap any creature to read what it carries."
      />
      <div className="pb-[clamp(72px,9vw,128px)]">
        <GuestbookSea />
      </div>
    </PageTransition>
  );
}
