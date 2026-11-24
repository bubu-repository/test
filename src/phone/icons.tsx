/**
 * App icons, drawn for this phone on one 24-unit grid, 1.6 stroke, round caps.
 * Each one is an object from her room, so the phone and the room share one inventory:
 *  - Posts: a sticky note with a strip of tape (the notes on her desk)
 *  - Chat: a die-cut chat card holding one question chip (the chips you tap in the app)
 *  - Call: a desk handset with a coiled cord
 *  - Work: an acrylic frame on a wire, the same as the three frames on her wall
 * Ink outlines, one pale prism fill, one cyan accent. No generic glyph set.
 */

type P = { className?: string };

export function IconPosts({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`ph-ico ${className ?? ''}`} aria-hidden="true" focusable="false">
      <path className="soft" d="M5 4.5h14v9.6l-4.9 4.9H5z" />
      <path d="M19 14.1h-3.9a1 1 0 0 0-1 1V19" />
      <path d="M8 9h8M8 12h5" />
      <rect className="acc" x="9.4" y="2.8" width="5.2" height="3" rx=".5" transform="rotate(-7 12 4.3)" />
    </svg>
  );
}

export function IconChat({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`ph-ico ${className ?? ''}`} aria-hidden="true" focusable="false">
      <path className="paper" d="M4 6.2A2.2 2.2 0 0 1 6.2 4h11.6A2.2 2.2 0 0 1 20 6.2v7.6a2.2 2.2 0 0 1-2.2 2.2H11l-4.6 3.6V16h-.2A2.2 2.2 0 0 1 4 13.8z" />
      <rect className="acc" x="7" y="7.1" width="7.6" height="3.2" rx="1.6" />
      <path d="M7.2 12.9h9.6" />
    </svg>
  );
}

export function IconCall({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`ph-ico ${className ?? ''}`} aria-hidden="true" focusable="false">
      <path
        className="soft"
        d="M3.5 9.6C4.6 6.7 8 5.5 12 5.5s7.4 1.2 8.5 4.1v2.2a2 2 0 0 1-2 2h-1.2a2 2 0 0 1-2-2v-1.5c-1-.7-2.1-.9-3.3-.9s-2.3.2-3.3.9v1.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z"
      />
      <path className="cord" d="M17.9 13.8c0 1.1-1.5 1.1-1.5 2.1s1.5 1 1.5 2-1.5 1.1-1.5 2.1" />
    </svg>
  );
}

export function IconWork({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`ph-ico ${className ?? ''}`} aria-hidden="true" focusable="false">
      <path d="M8.6 7 12 3.4 15.4 7" />
      <rect className="paper" x="4" y="7" width="16" height="13.5" rx="1.2" />
      <rect className="soft" x="7" y="10" width="10" height="7.6" rx=".4" />
      <path className="acc" d="M7.4 15.6 12.6 10.4h2.6L9.9 17.6H7.4z" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg viewBox="0 0 16 16" className="ph-ico ph-ico-sm" aria-hidden="true" focusable="false">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  );
}

export function IconBack() {
  return (
    <svg viewBox="0 0 16 16" className="ph-ico ph-ico-sm" aria-hidden="true" focusable="false">
      <path d="M10 3.5L5.5 8l4.5 4.5" />
    </svg>
  );
}

export function IconNext() {
  return (
    <svg viewBox="0 0 16 16" className="ph-ico ph-ico-sm" aria-hidden="true" focusable="false">
      <path d="M6 3.5L10.5 8 6 12.5" />
    </svg>
  );
}
