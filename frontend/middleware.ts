import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that never need auth
const PUBLIC_PREFIXES = ["/login", "/signup", "/onboarding", "/_next", "/api", "/favicon"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all public paths and static assets
  const isPublic =
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.includes(".");

  if (isPublic) return NextResponse.next();

  // Auth check: we store the token in sessionStorage (client-only),
  // so the middleware can't read it directly. We rely on the page
  // components to redirect via the Zustand store — no server redirect needed.
  // This middleware only handles truly server-side protection in the future
  // (e.g. when using httpOnly cookies). For now pass through.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
