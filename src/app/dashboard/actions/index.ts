"use server";

import { createClient } from "@/lib/supabase/server";
import type { ApacScores } from "@/lib/apac/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KandidaatProfile {
  voornaam: string;
  achternaam: string;
  email: string | null;
  telefoon: string | null;
  linkedin_url: string | null;
  vaardigheden: string[];
  tags: string[];
  beschikbaarheid: boolean | null;
  opzegtermijn: string | null;
  salarisindicatie: number | null;
  uurtarief: number | null;
}

export interface DashboardData {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    kandidaatId: string;
  };
  kandidaat: {
    poolStatus: string;
    profile: KandidaatProfile;
    profileComplete: boolean;
    isFirstLogin: boolean;
  };
  scores: ApacScores | null;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  related_variables: string[];
  author: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// 1. Get dashboard data (user + kandidaat + latest APAC scores)
// ---------------------------------------------------------------------------

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get portal_users record
  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("first_name, last_name, email, kandidaat_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!portalUser?.kandidaat_id) return null;

  // Get kandidaat profile + status
  const { data: kandidaat } = await supabase
    .from("kandidaten")
    .select("pool_status, voornaam, achternaam, email, telefoon, linkedin_url, vaardigheden, tags, beschikbaarheid, opzegtermijn, salarisindicatie, uurtarief, portal_onboarded_at")
    .eq("id", portalUser.kandidaat_id)
    .single();

  // Get latest APAC scores
  const { data: apac } = await supabase
    .from("apac_resultaten")
    .select("adaptability, personality, awareness, connection")
    .eq("kandidaat_id", portalUser.kandidaat_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const scores: ApacScores | null = apac
    ? {
        adaptability: Number(apac.adaptability),
        personality: Number(apac.personality),
        awareness: Number(apac.awareness),
        connection: Number(apac.connection),
      }
    : null;

  const profile: KandidaatProfile = {
    voornaam: kandidaat?.voornaam ?? "",
    achternaam: kandidaat?.achternaam ?? "",
    email: kandidaat?.email ?? null,
    telefoon: kandidaat?.telefoon ?? null,
    linkedin_url: kandidaat?.linkedin_url ?? null,
    vaardigheden: kandidaat?.vaardigheden ?? [],
    tags: kandidaat?.tags ?? [],
    beschikbaarheid: kandidaat?.beschikbaarheid ?? null,
    opzegtermijn: kandidaat?.opzegtermijn ?? null,
    salarisindicatie: kandidaat?.salarisindicatie ? Number(kandidaat.salarisindicatie) : null,
    uurtarief: kandidaat?.uurtarief ? Number(kandidaat.uurtarief) : null,
  };

  // Profile is "complete" when at least vaardigheden + beschikbaarheid are filled
  const profileComplete =
    profile.vaardigheden.length > 0 && profile.beschikbaarheid !== null;

  // First login = portal_onboarded_at was just set (within last 5 minutes) OR profile never completed
  const onboardedAt = kandidaat?.portal_onboarded_at;
  const isFirstLogin =
    !profileComplete &&
    (!onboardedAt ||
      Date.now() - new Date(onboardedAt).getTime() < 5 * 60 * 1000);

  return {
    user: {
      firstName: portalUser.first_name ?? "",
      lastName: portalUser.last_name ?? "",
      email: portalUser.email,
      kandidaatId: portalUser.kandidaat_id,
    },
    kandidaat: {
      poolStatus: kandidaat?.pool_status ?? "prospect",
      profile,
      profileComplete,
      isFirstLogin,
    },
    scores,
  };
}

// ---------------------------------------------------------------------------
// 2. Get related articles based on top scoring dimensions
// ---------------------------------------------------------------------------

export async function getRelatedArticles(
  scores: ApacScores
): Promise<Article[]> {
  const supabase = await createClient();

  // Find the top 2 dimensions
  const sorted = (
    Object.entries(scores) as [string, number][]
  ).sort((a, b) => b[1] - a[1]);

  const topDimensions = sorted.slice(0, 2).map(([dim]) => dim);

  // Fetch published articles that match any of the top dimensions
  const { data } = await supabase
    .from("articles")
    .select("id, title, content, related_variables, author, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (!data) return [];

  // Filter client-side: articles whose related_variables overlap with top dimensions
  return data.filter((article) => {
    const vars = article.related_variables as string[] | null;
    if (!vars || vars.length === 0) return true;
    return vars.some((v: string) => topDimensions.includes(v));
  }) as Article[];
}

// ---------------------------------------------------------------------------
// 3. Update kandidaat profile
// ---------------------------------------------------------------------------

import { z } from "zod";

const ProfileSchema = z.object({
  voornaam: z.string().min(1).max(100),
  achternaam: z.string().max(100).default(""),
  telefoon: z.string().max(20).optional().default(""),
  linkedin_url: z.string().url().or(z.literal("")).optional().default(""),
  vaardigheden: z.array(z.string().min(1).max(100)).max(30).default([]),
  beschikbaarheid: z.boolean().nullable().default(null),
  opzegtermijn: z.string().max(50).optional().default(""),
  salarisindicatie: z.number().min(0).max(500000).nullable().optional().default(null),
  uurtarief: z.number().min(0).max(500).nullable().optional().default(null),
});

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Niet ingelogd." };

  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("kandidaat_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!portalUser?.kandidaat_id) {
    return { success: false, error: "Kandidaat niet gevonden." };
  }

  // Parse vaardigheden from comma-separated or JSON
  let vaardigheden: string[] = [];
  const rawVaardigheden = formData.get("vaardigheden") as string;
  if (rawVaardigheden) {
    try {
      vaardigheden = JSON.parse(rawVaardigheden);
    } catch {
      vaardigheden = rawVaardigheden.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const parsed = ProfileSchema.safeParse({
    voornaam: formData.get("voornaam"),
    achternaam: formData.get("achternaam") || "",
    telefoon: formData.get("telefoon") || "",
    linkedin_url: formData.get("linkedin_url") || "",
    vaardigheden,
    beschikbaarheid: formData.get("beschikbaarheid") === "true" ? true :
                     formData.get("beschikbaarheid") === "false" ? false : null,
    opzegtermijn: formData.get("opzegtermijn") || "",
    salarisindicatie: formData.get("salarisindicatie") ? Number(formData.get("salarisindicatie")) : null,
    uurtarief: formData.get("uurtarief") ? Number(formData.get("uurtarief")) : null,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("kandidaten")
    .update({
      voornaam: parsed.data.voornaam,
      achternaam: parsed.data.achternaam || null,
      telefoon: parsed.data.telefoon || null,
      linkedin_url: parsed.data.linkedin_url || null,
      vaardigheden: parsed.data.vaardigheden,
      beschikbaarheid: parsed.data.beschikbaarheid,
      opzegtermijn: parsed.data.opzegtermijn || null,
      salarisindicatie: parsed.data.salarisindicatie,
      uurtarief: parsed.data.uurtarief,
    })
    .eq("id", portalUser.kandidaat_id);

  if (error) {
    console.error("[updateProfile] error:", error);
    return { success: false, error: "Kon profiel niet opslaan." };
  }

  // Update portal_users name too
  await supabase
    .from("portal_users")
    .update({
      first_name: parsed.data.voornaam,
      last_name: parsed.data.achternaam || null,
    })
    .eq("auth_user_id", user.id);

  return { success: true };
}
