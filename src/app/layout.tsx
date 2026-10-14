import type { Metadata, Viewport } from "next";
import { InlineScript } from "@/components/InlineScript";
import { description, identity } from "@/content/profile";
import { SiteLayout } from "@/layouts/SiteLayout";
import { fontVariables } from "@/lib/fonts";
import { preferencesInitScript } from "@/lib/preferences";
import { requireToken } from "@/lib/tokens";
import "@/styles/globals.css";

const title = `${identity.name} — ${identity.role} in ${identity.city}`;

export const metadata: Metadata = {
  metadataBase: new URL(identity.url),
  title: { default: title, template: `%s — ${identity.name}` },
  description,
  applicationName: identity.domain,
  authors: [{ name: identity.name, url: identity.url }],
  creator: identity.name,
  keywords: ["AI Product Engineer", "AI engineer", "LLM evals", "Product engineer", "New grad", "Design engineer", "Bekasi", "Jakarta", "Indonesia", "Portfolio", identity.name],
  openGraph: {
    type: "website",
    siteName: identity.domain,
    locale: "en_US",
    url: "/",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: requireToken("light", "--sky-top"),
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: identity.name,
  jobTitle: identity.role,
  email: `mailto:${identity.email}`,
  url: identity.url,
  address: { "@type": "PostalAddress", addressLocality: identity.city, addressCountry: "ID" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" data-sound="off" data-loader="off" className={fontVariables} suppressHydrationWarning>
      <head>
        <InlineScript html={preferencesInitScript} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      </head>
      <body className="relative flex min-h-dvh flex-col">
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}
