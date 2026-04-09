// Client-safe constants — no server imports
export const NOTIFICATIE_TYPES = [
  // Kandidaten
  { key: "nieuwe_kandidaat", label: "Nieuwe kandidaat", beschrijving: "Nieuwe kandidaat aangemeld via formulier", categorie: "Kandidaten", frequentie: "direct" },
  { key: "apac_voltooid", label: "APAC-test voltooid", beschrijving: "Kandidaat heeft de APAC-test afgerond (portal of Tally)", categorie: "Kandidaten", frequentie: "direct" },
  { key: "kandidaat_radical", label: "Radical status", beschrijving: "Kandidaat gepromoveerd naar Radical status", categorie: "Kandidaten", frequentie: "direct" },
  { key: "kandidaat_afgewezen", label: "Kandidaat afgewezen", beschrijving: "Kandidaat afgewezen na selectie", categorie: "Kandidaten", frequentie: "direct" },
  { key: "kandidaat_status_wijziging", label: "Statuswijziging", beschrijving: "Elke statuswijziging (alumni, intake, prospect, etc.)", categorie: "Kandidaten", frequentie: "direct" },
  // Vacatures & Matching
  { key: "nieuwe_vacature", label: "Nieuwe vacature", beschrijving: "Nieuwe vacature aangemaakt", categorie: "Vacatures & Matching", frequentie: "direct" },
  { key: "vacature_gesloten", label: "Vacature gesloten", beschrijving: "Vacature gesloten of ingevuld", categorie: "Vacatures & Matching", frequentie: "direct" },
  { key: "ai_match_resultaten", label: "AI match resultaten", beschrijving: "AI heeft nieuwe top-matches gevonden", categorie: "Vacatures & Matching", frequentie: "direct" },
  { key: "ai_inzichten", label: "AI inzichten", beschrijving: "AI inzichten en aandachtspunten over je pool", categorie: "Vacatures & Matching", frequentie: "dagelijks" },
  // Pipeline & Klanten
  { key: "nieuwe_klant", label: "Nieuwe klant", beschrijving: "Nieuwe klant toegevoegd", categorie: "Pipeline & Klanten", frequentie: "direct" },
  { key: "deal_stage_wijziging", label: "Deal stage wijziging", beschrijving: "Deal verplaatst naar andere stage in pipeline", categorie: "Pipeline & Klanten", frequentie: "direct" },
  { key: "deal_stagnatie", label: "Deal stagnatie", beschrijving: "Deal langer dan 14 dagen stil — actie nodig", categorie: "Pipeline & Klanten", frequentie: "dagelijks" },
  { key: "nieuwe_plaatsing", label: "Nieuwe plaatsing", beschrijving: "Kandidaat succesvol geplaatst bij klant", categorie: "Pipeline & Klanten", frequentie: "direct" },
  // Financieel
  { key: "factuur_betaald", label: "Factuur betaald", beschrijving: "Factuur is betaald", categorie: "Financieel", frequentie: "direct" },
  { key: "factuur_herinnering", label: "Factuur herinnering", beschrijving: "Openstaande factuur nog niet betaald", categorie: "Financieel", frequentie: "wekelijks" },
  // Overzichten
  { key: "wekelijks_overzicht", label: "Wekelijks overzicht", beschrijving: "Compleet CRM overzicht (kandidaten, vacatures, klanten, deals, financieel)", categorie: "Overzichten", frequentie: "wekelijks" },
  { key: "dagelijkse_samenvatting", label: "Dagelijkse samenvatting", beschrijving: "Korte samenvatting van alle wijzigingen vandaag", categorie: "Overzichten", frequentie: "dagelijks" },
] as const;

export type NotificatieKey = (typeof NOTIFICATIE_TYPES)[number]["key"];
