import type { Metadata } from "next";
import Link from "next/link";
import { Hallucination } from "@/features/notfound/Hallucination";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="container-page pt-36 pb-24 md:pt-44">
      <header className="text-center">
        <p className="type-eyebrow">404 · Page not found</p>
        <h1 className="type-display mx-auto mt-4 max-w-[16ch]">
          This page doesn&apos;t <span className="sticker-text">exist</span>.
        </h1>
        <p className="type-lead mx-auto mt-6 max-w-[40ch] text-muted">But ask a language model about it and you&apos;ll get an answer anyway. Watch.</p>
      </header>
      <div className="mt-14">
        <Hallucination />
      </div>
      <p className="mt-12 text-center">
        <Link href="/" className="link-arrow text-16">
          Back to the home page
        </Link>
      </p>
    </section>
  );
}
