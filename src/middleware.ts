import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const ADMIN_PREFIX = "/admin";
const LOGIN_PATH = "/admin/login";
const INVITE_PREFIX = "/admin/convite";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
  const isLoginRoute = pathname === LOGIN_PATH;
  const isInviteRoute = pathname === INVITE_PREFIX || pathname.startsWith(`${INVITE_PREFIX}/`);

  if (isAdminRoute && !isLoginRoute && !isInviteRoute && !sessionCookie) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
