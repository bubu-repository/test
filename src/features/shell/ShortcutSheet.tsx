"use client";

import { useId } from "react";
import { Dialog } from "@/components/Dialog";
import { ui, useUI } from "@/lib/ui";

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "Anywhere",
    items: [
      { keys: ["⌘", "K"], label: "Command palette (Ctrl+K on Windows/Linux)" },
      { keys: ["Esc"], label: "Close whatever is open, stop the tour" },
    ],
  },
  {
    title: "Single keys",
    items: [
      { keys: ["/"], label: "Ask the agent" },
      { keys: ["`"], label: "Terminal" },
      { keys: ["T"], label: "How this site works" },
      { keys: ["B"], label: "40-second brief" },
      { keys: ["S"], label: "Sticker book" },
      { keys: ["?"], label: "This sheet" },
    ],
  },
  {
    title: "Go to",
    items: [
      { keys: ["G", "H"], label: "Home" },
      { keys: ["G", "W"], label: "Work" },
      { keys: ["G", "L"], label: "Lab" },
      { keys: ["G", "A"], label: "About" },
      { keys: ["G", "G"], label: "Guestbook" },
    ],
  },
];

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-sm bg-surface-2 px-4 py-3">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-14 text-muted">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-pill bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}

export function ShortcutSheet() {
  const open = useUI((s) => s.overlay === "shortcuts");
  const keys = useUI((s) => s.keys);
  const titleId = useId();
  const close = () => ui.set({ overlay: null });

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId}>
      <div className="widget max-h-[calc(100dvh-24px)] overflow-y-auto p-5 md:p-7">
        <h2 id={titleId} className="type-title-2">
          Keyboard shortcuts
        </h2>
        <p className="mt-1 text-muted">Everything on this site works with a keyboard.</p>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-14 font-semibold text-accent-ink">{group.title}</h3>
              <ul className="mt-2 space-y-2">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-center gap-3 text-14">
                    <span className="flex shrink-0 gap-1">
                      {item.keys.map((k, i) => (
                        <kbd key={i}>{k}</kbd>
                      ))}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-6 grid gap-2">
          <Switch checked={keys} onChange={(v) => ui.set({ keys: v })} label="Single-key shortcuts" hint="Turn off if they clash with your screen reader or speech input." />
        </div>
      </div>
    </Dialog>
  );
}
