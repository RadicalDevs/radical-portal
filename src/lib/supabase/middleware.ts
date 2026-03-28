import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection rules:
 *
 * PUBLIC (no auth):
 *   /, /apac/*, /auth/*
 *
 * CANDIDATE (auth + role=candidate):
 *   /dashboard/*
 *
 * ADMIN (auth + role=admin):
 *   /admin/*
 */

// Routes that don't require authentication
const PUBLIC_PATHS = ["/", "/apac", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Homepagina: ingelogde gebruikers doorsturen naar dashboard/admin
  if (pathname === "/" && user) {
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: portalUser } = await serviceClient
      .from("portal_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = portalUser?.role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Public routes — no auth needed
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // For protected routes, check role via portal_users
  // We use the service role client to bypass RLS for this check
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );

  const { data: portalUser } = await serviceClient
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  // No portal_users record → CRM user trying to access portal
  if (!portalUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  const role = portalUser.role;

  // /admin/* → only admins
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // /dashboard/* → only candidates (admins can also access dashboard)
  if (pathname.startsWith("/dashboard")) {
    if (role !== "candidate" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
