import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const ADMIN_PREFIX = "/admin";
const LOGIN_PATH = "/admin/login";
const INVITE_PREFIX = "/admin/convite";
const NO_STORE = "private, no-store, must-revalidate";

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", NO_STORE);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let sessionCookie: string | null = null;
  try {
    sessionCookie = getSessionCookie(request);
  } catch {
    // Cookie malformado (ex.: proxy de operadora no mobile) não deve
    // derrubar o middleware inteiro — trata como "sem sessão".
    sessionCookie = null;
  }

  const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
  const isLoginRoute = pathname === LOGIN_PATH;
  const isInviteRoute = pathname === INVITE_PREFIX || pathname.startsWith(`${INVITE_PREFIX}/`);

  if (isAdminRoute && !isLoginRoute && !isInviteRoute && !sessionCookie) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return withNoStore(NextResponse.redirect(loginUrl));
  }

  return withNoStore(NextResponse.next());
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
