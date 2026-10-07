import { NextResponse, type NextRequest } from "next/server";
import { labItems } from "@/content/lab";

/**
 * <slug>.adelia.cc serves the experiment built into public/labs/<slug>/ (scripts/build-labs.mjs),
 * so one deployment with a wildcard domain hosts the main site and every lab. Requests to
 * adelia.cc itself never reach this function (see the matcher).
 */
const SUBDOMAINS = new Set(labItems.flatMap((l) => (l.where === "subdomain" ? [l.subdomain] : [])));

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const sub = host.endsWith(".adelia.cc") ? host.slice(0, -".adelia.cc".length) : "";
  if (!SUBDOMAINS.has(sub)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/labs/${sub}${url.pathname === "/" ? "/index.html" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [{ source: "/:path*", has: [{ type: "host", value: "[a-z0-9-]+\\.adelia\\.cc" }] }],
};
