import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// =============================================================================
// Middleware — Edge Runtime route protection via NextAuth v5 JWT session.
//
// Protected route groups:
//   /admin/*        — requires authenticated admin (isAdmin === true)
//   /dashboard/*    — requires any authenticated session
//   /api/admin/*    — requires authenticated admin; returns 403 JSON on failure
//
// /api/auth/* is intentionally excluded from the matcher so NextAuth's own
// handlers are never intercepted.
// =============================================================================

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const { pathname } = nextUrl;

  // ---------------------------------------------------------------------------
  // /api/admin/* — JSON API protection (no redirects, return 403)
  // ---------------------------------------------------------------------------
  if (pathname.startsWith("/api/admin/")) {
    // site-config GET is public — used for theming on all pages
    if (pathname === "/api/admin/site-config" && req.method === "GET") {
      return NextResponse.next();
    }
    if (!session?.user || !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // /admin/* — requires isAdmin
  // Authenticated non-admin  → /dashboard
  // Unauthenticated          → /login
  // ---------------------------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!session.user.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }

    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // /dashboard/* — requires any authenticated session
  // ---------------------------------------------------------------------------
  if (pathname.startsWith("/dashboard")) {
    if (!session?.user) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // All other matched paths — allow through
  return NextResponse.next();
});

// =============================================================================
// Matcher — only intercept the three protected route groups.
// /api/auth/* is deliberately excluded so NextAuth handles its own routes.
// =============================================================================

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/api/admin/:path*"],
};