"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

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

  // 1. Create Supabase Auth user
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
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

  // 4. Create portal_users record
  const { error: portalError } = await service.from("portal_users").insert({
    auth_user_id: authUserId,
    kandidaat_id: kandidaatId || null,
    role: "candidate",
    first_name: firstName,
    last_name: lastName,
    email,
  });

  if (portalError) {
    console.error("[register] portal_users insert error:", portalError);
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?type=recovery`,
  });

  if (error) {
    console.error("[forgotPassword] error:", error);
  }

  // Always return success to prevent email enumeration
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    console.error("[resendVerification] error:", error);
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
