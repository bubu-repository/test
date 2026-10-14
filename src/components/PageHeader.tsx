import type { ReactNode } from "react";

/**
 * The opening of every inner page, in the sky of the world behind it: a sticker label, the title,
 * one line of lead (they rise in one after another), then the page's own object below it. The words
 * are white on the deep sky (`data-sky-text` keeps the sky deep behind them and whatever the page
 * puts under the header); a little below, the sky ends in clouds that dissolve into the white page.
 */
export function PageHeader({ id, label, title, lead, top, children }: { id: string; label: string; title: ReactNode; lead?: ReactNode; top?: ReactNode; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="page-sky on-water container-page relative pt-36 text-center md:pt-44">
      <div data-sky-text>
        <header className="page-head">
          {top}
          <p className="type-sticker" style={{ ["--i" as string]: 0 }}>
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
      </div>
      <span className="page-sky__end" data-sky-end="1" aria-hidden="true" />
    </section>
  );
}
