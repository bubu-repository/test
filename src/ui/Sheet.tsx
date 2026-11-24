import { useEffect, useId, useRef, type ReactNode } from 'react';
import { closeTop } from '@/state';
import './sheet.css';

/**
 * The one overlay panel. Every room panel, the run sheet and the about card use it.
 * - Screen-title tag at top left (Shanison puts one on every overlay: shan 07, 09, 10).
 * - Close button inside the panel, Esc closes the top layer, focus is trapped and returned.
 * - `tone="verdict"`: cool dark glass for verdicts only (gak 15, 16). Everything else is frost.
 * Phones: a bottom sheet. Desktop: a panel on the right, so the room stays visible on the left.
 */
type Props = {
  tag: string;
  title: string;
  tone?: 'frost' | 'verdict';
  wide?: boolean;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? root.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
    };
  }, [ref, active]);
}

export function Sheet({ tag, title, tone = 'frost', wide, onClose = closeTop, children, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useFocusTrap(ref);
  return (
    <div className="sheet-scrim" data-tone={tone} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={ref}
        className="sheet"
        data-tone={tone}
        data-wide={wide || undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
      >
        <header className="sheet-head">
          <span className="tag">{tag}</span>
          <button className="sheet-close" onClick={onClose} aria-label="Close (Esc)">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </header>
        <h2 className="sheet-title" id={`${id}-t`}>
          {title}
        </h2>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </section>
    </div>
  );
}
