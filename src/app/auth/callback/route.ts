import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Auth callback handler.
 *
 * Supabase redirects here after:
 * - Email verification (signup confirmation)
 * - Password reset
 *
 * The URL contains a `code` param that we exchange for a session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery → redirect to a password update page (or dashboard for now)
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      // Email verification → determine redirect based on role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const service = createServiceClient();
        const { data: portalUser } = await service
          .from("portal_users")
          .select("role")
          .eq("auth_user_id", user.id)
          .single();

        if (portalUser?.role === "admin") {
          return NextResponse.redirect(`${origin}/admin`);
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Something went wrong → redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login`);
}
