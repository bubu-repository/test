/** First focusable element on every page. Visible only on keyboard focus. */
export function SkipLink({ targetId = "main" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="pill fixed top-3 left-3 z-[100] -translate-y-[calc(100%+64px)] focus-visible:translate-y-0"
      data-variant="ink"
    >
      Skip to content
    </a>
  );
}
