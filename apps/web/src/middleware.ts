import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * middleware.ts — web app route protection + security headers.
 *
 * Phase 11 hardening:
 *  - Uses next-auth/jwt `getToken` (Edge-compatible — no Node.js imports)
 *  - All non-public routes require a valid session token → redirect /login
 *  - API routes return 401 JSON
 *  - Tightened CSP in production; allows unsafe-eval & ws: in dev for Next.js HMR/client hydration
 */

const isDev = process.env.NODE_ENV !== "production";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  isDev ? "connect-src 'self' ws: wss: http: https:" : "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": CSP_DIRECTIVES.join("; "),
};

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/set-password",
  "/api/auth",
  "/api/campuses",
  "/api/clubs",
  "/api/groups",
  "/api/search",
  "/clubs",
  "/success-board",
  "/initiatives",
  "/api/initiatives",
  "/u",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"),
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Attach security headers to every response
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Verify session via JWT — Edge-compatible, no Node.js imports
  const token = await getToken({
    req: request,
    secret: process.env["AUTH_SECRET"] ?? process.env["NEXTAUTH_SECRET"] ?? "",
  });

  const isAuthApi = pathname === "/api/auth" || pathname.startsWith("/api/auth/");
  const isMutation = request.method !== "GET" && request.method !== "HEAD";
  const isGuestToken = Boolean(token && (token["role"] === "GUEST" || token["isGuest"] === true));

  // Strict Edge-level Guard: Guests and unauthenticated callers CANNOT perform non-auth API mutations
  if (isApiRoute(pathname) && !isAuthApi && isMutation) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isGuestToken) {
      return NextResponse.json(
        {
          error: "Guest accounts cannot perform this action. Please sign in with a campus account.",
        },
        { status: 403 },
      );
    }
  }

  // Guests cannot read private member-only endpoints
  if (
    isGuestToken &&
    (pathname.startsWith("/api/notifications") ||
      pathname.startsWith("/api/connections") ||
      pathname.startsWith("/api/follows") ||
      pathname.startsWith("/api/invites"))
  ) {
    return NextResponse.json(
      { error: "Guest accounts cannot access private member resources." },
      { status: 403 },
    );
  }

  // Forced Password Setup Guard (Security Rule 2)
  // On first login after Google OAuth verification, user MUST set password before any route is reachable
  const needsPasswordSetup = Boolean(token && token["needsPasswordSetup"]);
  if (needsPasswordSetup) {
    if (pathname === "/set-password" || isAuthApi) {
      return response;
    }
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Password setup required before proceeding.", needsPasswordSetup: true },
        { status: 403 },
      );
    }
    const setPasswordUrl = new URL("/set-password", request.url);
    return NextResponse.redirect(setPasswordUrl);
  }

  if (isPublic(pathname)) return response;

  if (!token) {
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
