import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import type { AppRole } from "@/lib/auth/roles";

export const roleCookieName = "app-role";

function getCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function buildRoleCookie(role: AppRole) {
  return {
    name: roleCookieName,
    value: role,
    options: getCookieOptions(),
  };
}

export function buildExpiredRoleCookie() {
  return {
    name: roleCookieName,
    value: "",
    options: {
      ...getCookieOptions(),
      maxAge: 0,
    },
  };
}
