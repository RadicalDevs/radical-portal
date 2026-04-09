// =============================================================================
// Template Variabelen — Geporteerd vanuit radical-crm-app/src/config/templateVariables.ts
// =============================================================================

export interface TemplateVariableGroup {
  label: string;
  variables: { key: string; label: string }[];
}

export const TEMPLATE_VARIABLES: TemplateVariableGroup[] = [
  {
    label: "Kandidaat",
    variables: [
      { key: "voornaam", label: "Voornaam" },
      { key: "achternaam", label: "Achternaam" },
      { key: "email", label: "Email" },
      { key: "telefoon", label: "Telefoon" },
      { key: "vaardigheden", label: "Vaardigheden" },
      { key: "beschikbaarheid", label: "Beschikbaarheid" },
      { key: "salarisindicatie", label: "Salarisindicatie" },
      { key: "uurtarief", label: "Uurtarief" },
    ],
  },
  {
    label: "Klant",
    variables: [
      { key: "bedrijfsnaam", label: "Bedrijfsnaam" },
      { key: "contactpersoon", label: "Contactpersoon" },
      { key: "kvk_nummer", label: "KVK Nummer" },
    ],
  },
  {
    label: "Vacature",
    variables: [
      { key: "functietitel", label: "Functietitel" },
      { key: "salaris_min", label: "Salaris Min" },
      { key: "salaris_max", label: "Salaris Max" },
      { key: "beschrijving", label: "Beschrijving" },
    ],
  },
];

export function getAllVariableKeys(): string[] {
  return TEMPLATE_VARIABLES.flatMap((g) => g.variables.map((v) => v.key));
}

export function extractUsedVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}
