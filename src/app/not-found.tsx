import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Hallucination } from "@/features/notfound/Hallucination";
import { Keychain } from "@/features/objects/Keychain";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <PageHeader
        id="notfound-title"
        label="404 · Page not found"
        title={
          <>
            This page doesn&apos;t <span className="sticker-text">exist</span>.
          </>
        }
        lead="But ask a language model about it and you'll get an answer anyway. Watch."
      />
      <section className="container-page pt-16 pb-12 md:pt-20" aria-label="Moci tries to describe the missing page">
        <Hallucination />
      </section>
      <section className="container-page pb-28 text-center" aria-labelledby="keys-title">
        <h2 id="keys-title" className="type-title">
          Lost? Here are the keys.
        </h2>
        <p className="mx-auto mt-3 max-w-[40ch] text-muted">One tag for every real page. Pick one.</p>
        <div className="mt-10 flex justify-center">
          <Keychain />
        </div>
        <p className="mt-10">
          <Link href="/" className="link-arrow text-16">
            Back to the home page
          </Link>
        </p>
      </section>
    </>
  );
}
