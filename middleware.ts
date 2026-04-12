import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { roleCookieName } from "@/lib/auth/cookies";
import { getDefaultPathForRole, type AppRole } from "@/lib/auth/roles";
import { protectedRoutePrefixes, routes } from "@/lib/constants/routes";
import { updateSession } from "@/lib/supabase/middleware";

function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  if (user && pathname === routes.login) {
    const role = request.cookies.get(roleCookieName)?.value as AppRole | undefined;
    const redirectPath = role ? getDefaultPathForRole(role) : routes.app;

    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/app/:path*", "/super-admin/:path*", "/auth/:path*"],
};
