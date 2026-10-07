import type { ReactNode } from "react";

/**
 * The opening of every inner page, on the sky with plenty of air: a glass label, the title, one
 * line of lead (they rise in one after another), then the page's own object (the pack, the
 * gumball machine, the PSP…) below it.
 */
export function PageHeader({ id, label, title, lead, top, children }: { id: string; label: string; title: ReactNode; lead?: ReactNode; top?: ReactNode; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="container-page relative pt-36 text-center md:pt-44">
      <header className="page-head">
        {top}
        <p className="type-eyebrow" style={{ ["--i" as string]: 0 }}>
          {label}
        </p>
        <h1 id={id} className="type-display mx-auto mt-5 max-w-[16ch]" style={{ ["--i" as string]: 1 }}>
          {title}
        </h1>
        {lead && (
          <p className="type-lead mx-auto mt-6 max-w-[46ch] text-muted" style={{ ["--i" as string]: 2 }}>
            {lead}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
