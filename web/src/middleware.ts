import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes (handled by their own auth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtected && !isAdmin && !isAuthRoute) {
    return NextResponse.next();
  }

  // Get session
  const session = await auth.api.getSession({ headers: request.headers });

  // Redirect to login if accessing protected route without session
  if ((isProtected || isAdmin) && !session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect admin routes for non-admins
  if (isAdmin && session?.user) {
    // Check role via DB — we'd need to fetch it here, but for middleware simplicity
    // we do a lightweight check. Full check happens in adminProcedure.
    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session?.user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
