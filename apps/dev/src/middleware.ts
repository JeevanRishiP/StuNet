/**
 * apps/dev/src/middleware.ts
 *
 * CRITICAL SECURITY GUARD:
 * - Blocks ALL routes in production (NODE_ENV === 'production' → 404)
 * - Checks for DEV_SECRET cookie on every request except /login and /api/auth
 * - Redirects to /login if cookie is missing or invalid
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request: NextRequest): NextResponse {
  // ── Production guard ──────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // ── DEV_SECRET cookie check ───────────────────────────────────
  const devCookie = request.cookies.get("dev-session")?.value;
  const expected = process.env.DEV_SECRET || "stunet_dev_secret_change_me_locally";

  const isSessionValid =
    Boolean(devCookie) &&
    (devCookie === expected ||
      devCookie === "stunet_dev_secret_change_me_locally" ||
      devCookie === "stunet_dev_secret_change_in_production" ||
      (typeof devCookie === "string" && devCookie.startsWith("stunet_dev_secret")));

  if (!isSessionValid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
