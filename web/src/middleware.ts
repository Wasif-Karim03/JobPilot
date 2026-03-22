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

  // Better Auth sets __Secure- prefix on HTTPS (production)
  const hasSession = request.cookies.getAll().some(
    (c) => (c.name === "__Secure-jobpilot.session_token" || c.name === "jobpilot.session_token") && !!c.value
  );

  // Redirect to login if accessing protected route without session cookie
  if ((isProtected || isAdmin) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages → always to onboarding first.
  // The onboarding page checks completion and redirects to /dashboard if done.
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
