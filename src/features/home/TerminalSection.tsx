import { Laptop, TerminalScreen } from "../terminal/Terminal";

const TRY = [
  { cmd: "neofetch", what: "who's this" },
  { cmd: "ls work", what: "the projects" },
  { cmd: "cat README.md", what: "the story" },
  { cmd: "open lab", what: "go somewhere" },
  { cmd: "sudo hire adelia", what: "you'll see" },
];

/** Home: for engineers. A real little shell, running on a laptop, with a sticky note of things to try. */
export function TerminalSection() {
  return (
    <section id="terminal" aria-labelledby="terminal-title" className="container-page section-y scroll-mt-16" data-xr="TerminalSection · the shell on a laptop">
      <div className="mx-auto max-w-[44rem] text-center">
        <p className="type-eyebrow">For engineers</p>
        <h2 id="terminal-title" className="type-display mt-3">
          Poke around from a <span className="sticker-text">terminal</span>.
        </h2>
        <p className="type-lead mx-auto mt-5 max-w-[44ch] text-muted">A small shell with a virtual filesystem that maps to this site. It also opens anywhere with the backtick key.</p>
      </div>

      <div className="relative mx-auto mt-14 max-w-[860px] md:mt-20">
        <Laptop>
          <TerminalScreen heightClass="h-[300px] md:h-[360px]" />
        </Laptop>
        <div className="laptop-note sticky-note">
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase opacity-70">Things to try</p>
          <ul className="mt-2.5 space-y-1.5 text-14 leading-snug">
            {TRY.map((t) => (
              <li key={t.cmd}>
                <code className="font-mono text-[12.5px] font-semibold">{t.cmd}</code> <span className="opacity-70">· {t.what}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
