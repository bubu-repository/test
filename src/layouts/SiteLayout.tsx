import type { ReactNode } from "react";
import { PreferencesSync } from "@/components/PreferencesSync";
import { SkipLink } from "@/components/SkipLink";
import { SiteChrome } from "@/features/shell/SiteChrome";
import { SiteFooter } from "@/features/shell/SiteFooter";
import { SiteNav } from "@/features/shell/SiteNav";

/** Shared by every page: skip link, floating nav, main landmark, footer, and the interactive chrome. */
export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <SiteChrome />
      <PreferencesSync />
    </>
  );
}
