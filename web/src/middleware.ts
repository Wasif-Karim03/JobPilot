import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/jobs",
  "/applications",
  "/resume",
  "/outreach",
  "/settings",
  "/onboarding",
];
// Routes that require ADMIN role
const ADMIN_ROUTES = ["/admin"];
// Routes that redirect authenticated users away
const AUTH_ROUTES = ["/login", "/register"];

// Better Auth session cookie name (matches cookiePrefix in auth.ts)
const SESSION_COOKIE = "jobpilot.session_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Public routes — pass through immediately
  if (!isProtected && !isAdmin && !isAuthRoute) {
    return NextResponse.next();
  }

  // Lightweight session check — just verify cookie exists (no DB call)
  // Full auth validation happens in tRPC procedures
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;

  // Redirect to login if accessing protected route without session cookie
  if ((isProtected || isAdmin) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
