"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  generateVerificationToken,
  getVerificationTokenExpiry,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const RegisterSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().min(1, "Achternaam is verplicht").max(100),
  email: z.string().email("Ongeldig e-mailadres"),
  password: z
    .string()
    .min(8, "Wachtwoord moet minimaal 8 tekens zijn")
    .regex(/[A-Z]/, "Wachtwoord moet een hoofdletter bevatten")
    .regex(/[0-9]/, "Wachtwoord moet een cijfer bevatten"),
  sessionId: z.string().uuid().optional().or(z.literal("")),
});

const LoginSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
});

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

export type AuthResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// 1. Register
// ---------------------------------------------------------------------------

export async function register(formData: FormData): Promise<AuthResult> {
  const parsed = RegisterSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    sessionId: formData.get("sessionId") || "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { firstName, lastName, email, password, sessionId } = parsed.data;

  // 1. Create Supabase Auth user (geen emailRedirectTo — wij sturen zelf verificatie)
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { success: false, error: "Dit e-mailadres is al geregistreerd. Probeer in te loggen." };
    }
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: "Er ging iets mis bij het aanmaken van je account." };
  }

  const authUserId = authData.user.id;

  // 2. Server-side operations with service role (bypasses RLS)
  const service = createServiceClient();

  // 3. Check if email already exists in kandidaten
  const { data: existingKandidaat } = await service
    .from("kandidaten")
    .select("id")
    .eq("email", email)
    .single();

  let kandidaatId: string;

  if (existingKandidaat) {
    // Link existing kandidaat to portal user
    kandidaatId = existingKandidaat.id;
    await service
      .from("kandidaten")
      .update({
        portal_user_id: authUserId,
        portal_onboarded_at: new Date().toISOString(),
      })
      .eq("id", kandidaatId);
  } else {
    // Create new kandidaat record
    const { data: newKandidaat, error: kandError } = await service
      .from("kandidaten")
      .insert({
        voornaam: firstName,
        achternaam: lastName,
        email,
        pool_status: "prospect",
        apac_source: "portal",
        portal_user_id: authUserId,
        portal_onboarded_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (kandError || !newKandidaat) {
      console.error("[register] kandidaten insert error:", kandError);
      // Non-blocking — account is created, kandidaat link can happen later
      kandidaatId = "";
    } else {
      kandidaatId = newKandidaat.id;
    }
  }

  // 4. Create portal_users record with verification token
  const verificationToken = generateVerificationToken();
  const tokenExpiry = getVerificationTokenExpiry();

  const { error: portalError } = await service.from("portal_users").insert({
    auth_user_id: authUserId,
    kandidaat_id: kandidaatId || null,
    role: "candidate",
    first_name: firstName,
    last_name: lastName,
    email,
    email_verified: false,
    verification_token: verificationToken,
    verification_token_expires_at: tokenExpiry.toISOString(),
  });

  if (portalError) {
    console.error("[register] portal_users insert error:", portalError);
  }

  // 4b. Stuur verificatie-email via eigen SMTP
  const emailSent = await sendVerificationEmail({
    to: email,
    firstName,
    token: verificationToken,
  });
  if (!emailSent) {
    console.error("[register] Verificatie-email kon niet worden verstuurd naar:", email);
  }

  // 5. If there's an APAC session, link it to the kandidaat
  if (sessionId && kandidaatId) {
    // Link portal_sessions
    await service
      .from("portal_sessions")
      .update({
        linked_kandidaat_id: kandidaatId,
        linked_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Link apac_resultaten that belong to this session
    await service
      .from("apac_resultaten")
      .update({ kandidaat_id: kandidaatId })
      .eq("portal_session_id", sessionId);
  }

  // 6. Log event
  await service.from("user_events").insert({
    user_id: authUserId,
    event_type: "account_created",
    page: "/auth/register",
    metadata: {
      kandidaat_id: kandidaatId || null,
      session_linked: !!sessionId,
    },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// 2. Login
// ---------------------------------------------------------------------------

export type LoginResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

export async function login(formData: FormData): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    if (authError.message.includes("Invalid login credentials")) {
      return { success: false, error: "Ongeldig e-mailadres of wachtwoord." };
    }
    if (authError.message.includes("Email not confirmed")) {
      return { success: false, error: "Je e-mailadres is nog niet geverifieerd. Check je inbox." };
    }
    return { success: false, error: authError.message };
  }

  // Check portal_users role for redirect
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Er ging iets mis bij het inloggen." };
  }

  const service = createServiceClient();
  const { data: portalUser } = await service
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!portalUser) {
    // User exists in Supabase Auth but has no portal_users record
    // → probably a CRM user
    await supabase.auth.signOut();
    return {
      success: false,
      error: "CRM_USER",
    };
  }

  const redirectTo = portalUser.role === "admin" ? "/admin" : "/dashboard";
  return { success: true, redirectTo };
}

// ---------------------------------------------------------------------------
// 3. Forgot password
// ---------------------------------------------------------------------------

export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const service = createServiceClient();

  // Zoek portal_user
  const { data: portalUser } = await service
    .from("portal_users")
    .select("id, first_name")
    .eq("email", parsed.data.email)
    .single();

  if (!portalUser) {
    // Geen info weggeven — altijd success retourneren
    return { success: true };
  }

  // Genereer reset token (1 uur geldig)
  const token = generateVerificationToken();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);

  await service
    .from("portal_users")
    .update({
      reset_token: token,
      reset_token_expires_at: expiry.toISOString(),
    })
    .eq("id", portalUser.id);

  // Stuur email via eigen SMTP
  await sendPasswordResetEmail({
    to: parsed.data.email,
    firstName: portalUser.first_name || "daar",
    token,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// 3b. Reset password (met token)
// ---------------------------------------------------------------------------

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is verplicht"),
  password: z
    .string()
    .min(8, "Wachtwoord moet minimaal 8 tekens zijn")
    .regex(/[A-Z]/, "Wachtwoord moet een hoofdletter bevatten")
    .regex(/[0-9]/, "Wachtwoord moet een cijfer bevatten"),
});

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { token, password } = parsed.data;
  const service = createServiceClient();

  // Zoek user via token
  const { data: portalUser } = await service
    .from("portal_users")
    .select("id, auth_user_id, reset_token_expires_at")
    .eq("reset_token", token)
    .single();

  if (!portalUser) {
    return { success: false, error: "Ongeldige of verlopen reset-link. Vraag een nieuwe aan." };
  }

  // Check expiry
  if (
    portalUser.reset_token_expires_at &&
    new Date(portalUser.reset_token_expires_at) < new Date()
  ) {
    return { success: false, error: "Deze reset-link is verlopen. Vraag een nieuwe aan." };
  }

  // Update wachtwoord via Supabase Admin API
  // Use @supabase/supabase-js directly — @supabase/ssr doesn't reliably handle auth.admin
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    portalUser.auth_user_id,
    { password }
  );

  if (updateError) {
    console.error("[resetPassword] error:", updateError);
    return { success: false, error: "Kon wachtwoord niet bijwerken. Probeer het later opnieuw." };
  }

  // Clear token
  await service
    .from("portal_users")
    .update({
      reset_token: null,
      reset_token_expires_at: null,
    })
    .eq("id", portalUser.id);

  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. Resend verification email
// ---------------------------------------------------------------------------

export async function resendVerification(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  if (!email) {
    return { success: false, error: "E-mailadres is verplicht." };
  }

  const service = createServiceClient();

  // Zoek portal_user en check of al geverifieerd
  const { data: portalUser } = await service
    .from("portal_users")
    .select("id, first_name, email_verified")
    .eq("email", email)
    .single();

  if (!portalUser) {
    // Geen user gevonden — geef geen info weg (prevent enumeration)
    return { success: true };
  }

  if (portalUser.email_verified) {
    return { success: false, error: "Je e-mailadres is al geverifieerd. Je kunt inloggen." };
  }

  // Genereer nieuw token
  const newToken = generateVerificationToken();
  const newExpiry = getVerificationTokenExpiry();

  await service
    .from("portal_users")
    .update({
      verification_token: newToken,
      verification_token_expires_at: newExpiry.toISOString(),
    })
    .eq("id", portalUser.id);

  // Stuur email via eigen SMTP
  const sent = await sendVerificationEmail({
    to: email,
    firstName: portalUser.first_name || "daar",
    token: newToken,
  });

  if (!sent) {
    console.error("[resendVerification] Email verzenden mislukt naar:", email);
    return { success: false, error: "Kon verificatie-email niet versturen. Probeer het later opnieuw." };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. Logout
// ---------------------------------------------------------------------------

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
