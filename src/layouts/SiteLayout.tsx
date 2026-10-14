import type { ReactNode } from "react";
import { PreferencesSync } from "@/components/PreferencesSync";
import { SkipLink } from "@/components/SkipLink";
import { Loader } from "@/features/shell/Loader";
import { SiteChrome } from "@/features/shell/SiteChrome";
import { SiteFooter } from "@/features/shell/SiteFooter";
import { SiteNav } from "@/features/shell/SiteNav";
import { World } from "@/features/world/World";

/** Shared by every page: the world (sky and sea) behind it all, the loading screen, skip link, floating nav, main landmark, footer, and the interactive chrome. */
export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <World />
      <Loader />
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
