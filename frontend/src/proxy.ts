import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const sessionCookieName = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "pos_mans_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/owner") && !pathname.startsWith("/superadmin")) {
    return NextResponse.next();
  }

  if (request.cookies.has(sessionCookieName)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/owner/:path*", "/superadmin/:path*"],
};
