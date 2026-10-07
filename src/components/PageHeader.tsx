import type { ReactNode } from "react";

/**
 * The opening of every inner page, on white with plenty of air: a printed eyebrow, the title, one
 * line of lead, then the page's own object (the pack, the gumball machine, the PSP…) below it.
 */
export function PageHeader({ id, label, title, lead, top, children }: { id: string; label: string; title: ReactNode; lead?: ReactNode; top?: ReactNode; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="container-page relative pt-36 text-center md:pt-44">
      <header>
        {top}
        <p className="type-eyebrow">{label}</p>
        <h1 id={id} className="type-display mx-auto mt-4 max-w-[16ch]">
          {title}
        </h1>
        {lead && <p className="type-lead mx-auto mt-6 max-w-[46ch] text-muted">{lead}</p>}
      </header>
      {children}
    </section>
  );
}
