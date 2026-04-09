import { createServiceClient } from "@/lib/supabase/server";
import { isAutomationEnabled } from "./settings";
import { buildKandidaatNaam } from "./helpers";
import { notifyAdmins } from "./notifyAdmins";
import { emailWrap, datumNL, ROW, BADGE, buildCtaButton } from "@/lib/email/templates";

interface StageChangeContext {
  kandidaatId?: string;
  vacatureId?: string;
  klantId?: string;
  oldStage?: string;
  newStage: string;
}

const VOORSTEL_STAGES = ["voorgesteld", "perm_03_pitch", "interim_03_voorstel"];
const GESPREK_STAGES = ["eerste_gesprek", "perm_08_gesprekken", "interim_07_kennismaking"];
const AFGEROND_STAGES_PATTERN = /_afgerond$/;
const GEPLAATST_STAGES = ["geplaatst", "interim_10_actief", "project_07_actief"];

export async function onPipelineStageChange(ctx: StageChangeContext): Promise<void> {
  if (!(await isAutomationEnabled("pipeline_stage_emails"))) return;

  const supabase = createServiceClient();

  const { data: admins } = await supabase
    .from("portal_users")
    .select("auth_user_id")
    .eq("role", "admin");

  if (!admins?.length) return;

  let naam = "";
  if (ctx.kandidaatId) {
    const { data: kandidaat } = await supabase
      .from("kandidaten")
      .select("voornaam, achternaam")
      .eq("id", ctx.kandidaatId)
      .single();
    naam = buildKandidaatNaam(kandidaat as { voornaam: string; achternaam: string } | null);
    if (naam === "?") naam = "";
  }

  let klantNaam = "";
  if (ctx.klantId) {
    const { data: klant } = await supabase
      .from("klanten")
      .select("bedrijfsnaam")
      .eq("id", ctx.klantId)
      .single();
    if (klant) klantNaam = (klant as { bedrijfsnaam: string }).bedrijfsnaam;
  }

  const entity = naam || klantNaam || "Deal";
  const stage = ctx.newStage;
  const link = ctx.kandidaatId ? `/kandidaten/${ctx.kandidaatId}` : "/pipeline/permanent";
  const adminIds = admins.map((a) => (a as { auth_user_id: string }).auth_user_id);

  if (VOORSTEL_STAGES.includes(stage)) {
    await supabase.from("notificaties").insert(
      adminIds.map((id) => ({
        user_id: id,
        type: "info",
        titel: `${entity} voorgesteld`,
        bericht: `${entity} is voorgesteld aan de klant.`,
        link,
      }))
    );
    return;
  }

  if (GESPREK_STAGES.includes(stage)) {
    await supabase.from("notificaties").insert(
      adminIds.map((id) => ({
        user_id: id,
        type: "info",
        titel: `Gesprek gepland: ${entity}`,
        bericht: `${entity} gaat in gesprek. Vergeet follow-up niet.`,
        link,
      }))
    );

    // Automatisch follow-up taak aanmaken (zoals CRM deed)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2);
    await supabase.from("taken").insert({
      titel: `Follow-up gesprek: ${entity}`,
      beschrijving: `Neem contact op over het gesprek met ${entity}. Stage: ${stage}`,
      status: "open",
      prioriteit: "hoog",
      deadline: deadline.toISOString().split("T")[0],
      toegewezen_aan: adminIds[0] || null,
      klant_id: ctx.klantId || null,
      kandidaat_id: ctx.kandidaatId || null,
    }).then(undefined, (err) => console.error("[pipelineNotifier] Taak aanmaken mislukt:", err));

    return;
  }

  if (GEPLAATST_STAGES.includes(stage)) {
    await supabase.from("notificaties").insert(
      adminIds.map((id) => ({
        user_id: id,
        type: "info",
        titel: `${entity} is geplaatst!`,
        bericht: `${entity} is succesvol geplaatst.`,
        link,
      }))
    );

    // E-mail notificatie via nieuwe_plaatsing voorkeur
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
    notifyAdmins({
      key: "nieuwe_plaatsing",
      subject: `Nieuwe plaatsing: ${naam || entity}`,
      html: emailWrap("Kandidaat succesvol geplaatst", datumNL(),
        `<table style="width:100%;border-collapse:collapse">
          ${naam ? ROW("Kandidaat", naam) : ""}
          ${klantNaam ? ROW("Klant", klantNaam, true) : ""}
          ${ROW("Stage", BADGE(stage.toUpperCase().replace(/_/g, " "), "#2ed573"), !klantNaam)}
          ${ROW("Status", BADGE("GEPLAATST", "#2ed573"), true)}
        </table>
        ${buildCtaButton(ctx.kandidaatId ? `${siteUrl}/admin/candidates?id=${ctx.kandidaatId}` : `${siteUrl}/admin/vacatures`, "Bekijk details")}`),
      bericht: `${naam || entity} is succesvol geplaatst${klantNaam ? ` bij ${klantNaam}` : ""}`,
      link,
    }).catch(() => {});

    return;
  }

  if (AFGEROND_STAGES_PATTERN.test(stage)) {
    await supabase.from("notificaties").insert(
      adminIds.map((id) => ({
        user_id: id,
        type: "info",
        titel: `${entity} afgerond`,
        bericht: `Pipeline voor ${entity} is afgerond (${stage}).`,
        link,
      }))
    );
    return;
  }
}
