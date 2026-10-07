import type { ReactNode } from "react";
import { PreferencesSync } from "@/components/PreferencesSync";
import { SkipLink } from "@/components/SkipLink";
import { SiteChrome } from "@/features/shell/SiteChrome";
import { SiteFooter } from "@/features/shell/SiteFooter";
import { SiteNav } from "@/features/shell/SiteNav";
import { SkyBackdrop } from "@/features/world/SkyBackdrop";

/** Shared by every page: the sky behind it all, skip link, floating nav, main landmark, footer (with the sea), and the interactive chrome. */
export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkyBackdrop />
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
