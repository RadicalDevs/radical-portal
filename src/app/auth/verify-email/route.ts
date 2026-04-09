import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Email verification endpoint.
 *
 * Validates the token from the verification email link,
 * marks the portal_user as email_verified, and redirects to login.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      `${origin}/auth/verify?error=missing_token`
    );
  }

  const service = createServiceClient();

  // Look up user by token
  const { data: portalUser, error } = await service
    .from("portal_users")
    .select("id, email_verified, verification_token_expires_at")
    .eq("verification_token", token)
    .single();

  if (error || !portalUser) {
    return NextResponse.redirect(
      `${origin}/auth/verify?error=invalid_token`
    );
  }

  // Already verified
  if (portalUser.email_verified) {
    return NextResponse.redirect(
      `${origin}/auth/login?verified=already`
    );
  }

  // Check expiry
  if (
    portalUser.verification_token_expires_at &&
    new Date(portalUser.verification_token_expires_at) < new Date()
  ) {
    return NextResponse.redirect(
      `${origin}/auth/verify?error=expired_token`
    );
  }

  // Mark as verified — clear token
  await service
    .from("portal_users")
    .update({
      email_verified: true,
      verification_token: null,
      verification_token_expires_at: null,
    })
    .eq("id", portalUser.id);

  // Redirect to login with success message
  return NextResponse.redirect(`${origin}/auth/login?verified=true`);
}
