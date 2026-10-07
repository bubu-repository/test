import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps a page so it fades and rises in on navigation. Layouts persist across navigations, so
 * this lives in each page. Named elements inside (cards) morph on their own.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
