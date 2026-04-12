import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildExpiredRoleCookie, buildRoleCookie } from "@/lib/auth/cookies";
import { getUserContextById } from "@/lib/auth/queries";
import { getDefaultPathForRole } from "@/lib/auth/roles";
import { routes } from "@/lib/constants/routes";
import { getServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? routes.home;
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    const response = NextResponse.redirect(new URL(routes.login, request.url));
    const expiredRoleCookie = buildExpiredRoleCookie();
    response.cookies.set(
      expiredRoleCookie.name,
      expiredRoleCookie.value,
      expiredRoleCookie.options,
    );

    return response;
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  const context = await getUserContextById(user.id);

  if (!context) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  const roleCookie = buildRoleCookie(context.role);
  response.cookies.set(roleCookie.name, roleCookie.value, roleCookie.options);

  const targetPath = next === routes.home ? getDefaultPathForRole(context.role) : next;

  return NextResponse.redirect(new URL(targetPath, request.url), {
    headers: response.headers,
  });
}
