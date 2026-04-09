/**
 * Gedeelde e-mail template helpers voor alle notificatie flows.
 * Gebruikt door: notificatie route, APAC actions, Tally webhook, processApacScores.
 */

// ── Inline style helpers ───────────────────────────────────────────

export const BADGE = (text: string, color: string) =>
  `<span style="background:${color};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600">${text}</span>`;

export const ROW = (label: string, value: string, bg = false) =>
  `<tr${bg ? ' style="background:#f8f9fa"' : ""}><td style="padding:10px 12px;border-bottom:1px solid #eee"><strong>${label}</strong></td><td style="padding:10px 12px;border-bottom:1px solid #eee">${value}</td></tr>`;

export const STATUS_KLEUR: Record<string, string> = {
  prospect: "#3498db",
  in_selectie: "#f39c12",
  pool: "#f39c12",
  radical: "#2ed573",
  alumni: "#9b59b6",
  afgewezen: "#e74c3c",
  open: "#2ed573",
  gesloten: "#95a5a6",
  on_hold: "#95a5a6",
  pending_review: "#f39c12",
};

// ── Layout helpers ─────────────────────────────────────────────────

export function emailWrap(title: string, sub: string, body: string) {
  return `
  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff">
    <div style="background:linear-gradient(135deg,#0D0D14 0%,#13131F 100%);padding:24px 32px;border-radius:8px 8px 0 0">
      <h1 style="color:#2ed573;font-size:20px;margin:0">${title}</h1>
      <p style="color:#aaa;font-size:12px;margin:4px 0 0">${sub}</p>
    </div>
    <div style="padding:20px 32px">${body}
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;text-align:center">
        <p style="color:#ccc;font-size:10px">Radical Network — radicalnetwork.nl</p>
      </div>
    </div>
  </div>`;
}

export const datumNL = () =>
  new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// ── CTA button ─────────────────────────────────────────────────────

export function buildCtaButton(url: string, text: string) {
  return `
    <div style="margin:20px 0">
      <a href="${url}" style="display:inline-block;background:#2ed573;color:#0D0D14;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
        ${text} →
      </a>
    </div>`;
}

// ── Afwijzingsreden box ────────────────────────────────────────────

export function buildRedenAfwijzingHtml(reden: string | null | undefined) {
  if (!reden) return "";
  return `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#dc2626;font-weight:bold;margin:0 0 4px 0;font-size:13px">Reden afwijzing</p>
      <p style="color:#991b1b;margin:0;font-size:14px">${reden}</p>
    </div>`;
}

// ── APAC score tabel ───────────────────────────────────────────────

export interface ApacScoreInput {
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
}

export function buildApacScoreTable(
  scores: ApacScoreInput,
  maxScores?: ApacScoreInput
) {
  const dims = ["adaptability", "personality", "awareness", "connection"] as const;
  const labels: Record<string, string> = {
    adaptability: "Adaptability",
    personality: "Personality",
    awareness: "Awareness",
    connection: "Connection",
  };

  const totaal = dims.reduce((s, d) => s + scores[d], 0);
  const totaalMax = maxScores
    ? dims.reduce((s, d) => s + maxScores[d], 0)
    : undefined;

  const rows = dims
    .map(
      (d) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${labels[d]}</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee">${scores[d]}${maxScores ? `/${maxScores[d]}` : ""}</td></tr>`
    )
    .join("");

  const percentage = totaalMax ? ` (${Math.round((totaal / totaalMax) * 100)}%)` : "";

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f4f4f4">
        <th style="text-align:left;padding:8px 12px;font-size:12px;color:#888;text-transform:uppercase">Dimensie</th>
        <th style="text-align:right;padding:8px 12px;font-size:12px;color:#888;text-transform:uppercase">Score</th>
      </tr>
      ${rows}
      <tr style="background:#f4f4f4;font-weight:bold">
        <td style="padding:8px 12px">Totaal</td>
        <td style="padding:8px 12px;text-align:right">${totaal}${totaalMax ? `/${totaalMax}` : ""}${percentage}</td>
      </tr>
    </table>`;
}

// ── De Poort beslissing badge ──────────────────────────────────────

export function buildDePoortBadge(
  poolStatus: string,
  leerfase?: boolean
) {
  if (leerfase) {
    return BADGE("LEERFASE — REVIEW NODIG", "#f39c12");
  }
  if (poolStatus === "pool" || poolStatus === "in_selectie") {
    return BADGE("DOOR DE POORT", "#2ed573");
  }
  if (poolStatus === "afgewezen") {
    return BADGE("AFGEWEZEN", "#e74c3c");
  }
  return BADGE("ONDER DREMPEL", "#e74c3c");
}

// ── APAC resultaten email voor kandidaat ───────────────────────────

const DIM_COLORS: Record<string, string> = {
  adaptability: "#2ed573",
  personality: "#E6734F",
  awareness: "#3B82F6",
  connection: "#8B5CF6",
};

export function buildApacResultsEmailHtml(opts: {
  firstName: string;
  scores: ApacScoreInput;
  maxScores: ApacScoreInput;
  sessionId: string;
}) {
  const { firstName, scores, maxScores, sessionId } = opts;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const registerUrl = `${siteUrl}/auth/register?session=${sessionId}`;
  const resultsUrl = `${siteUrl}/apac/results/${sessionId}`;

  const dims = ["adaptability", "personality", "awareness", "connection"] as const;
  const labels: Record<string, string> = {
    adaptability: "Adaptability",
    personality: "Personality",
    awareness: "Awareness",
    connection: "Connection",
  };

  const totaalMax = dims.reduce((s, d) => s + maxScores[d], 0);

  const scoreRows = dims
    .map((d) => {
      const pct = maxScores[d] > 0 ? Math.round((scores[d] / maxScores[d]) * 100) : 0;
      const barWidth = Math.max(pct, 4);
      return `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #252538;color:#F0F2F8;font-size:14px;font-weight:600;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${DIM_COLORS[d]};margin-right:8px;vertical-align:middle;"></span>
            ${labels[d]}
          </td>
          <td style="padding:10px 16px;border-bottom:1px solid #252538;text-align:right;color:#B8BDD4;font-size:14px;">
            ${scores[d]} / ${maxScores[d]}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:0 16px 8px;">
            <div style="background:#1A1A2E;border-radius:4px;height:6px;overflow:hidden;">
              <div style="background:${DIM_COLORS[d]};height:100%;width:${barWidth}%;border-radius:4px;"></div>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#0D0D14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D14;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background-color:#13131F;border-radius:16px;border:1px solid #252538;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 16px;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background:rgba(46,213,115,0.1);color:#2ed573;font-size:28px;text-align:center;">📊</div>
          <h1 style="color:#F0F2F8;font-size:22px;margin:16px 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Je APAC-resultaten</h1>
          <p style="color:#5D6280;font-size:13px;margin:0;">Radical AI Talent Assessment</p>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:0 32px 20px;color:#B8BDD4;font-size:15px;line-height:1.6;">
          <p>Hoi ${firstName},</p>
          <p>Bedankt voor het maken van de APAC-test! Hieronder vind je een preview van je scores per dimensie.</p>
        </td></tr>

        <!-- Score tabel -->
        <tr><td style="padding:0 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A2E;border-radius:12px;border:1px solid #252538;border-collapse:separate;">
            <tr>
              <th style="text-align:left;padding:12px 16px;font-size:11px;color:#5D6280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #252538;">Dimensie</th>
              <th style="text-align:right;padding:12px 16px;font-size:11px;color:#5D6280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #252538;">Score</th>
            </tr>
            ${scoreRows}
            <!-- Totaal verborgen -->
            <tr>
              <td style="padding:14px 16px;color:#F0F2F8;font-size:15px;font-weight:700;">
                Totaalscore
              </td>
              <td style="padding:14px 16px;text-align:right;color:#5D6280;font-size:15px;font-weight:700;">
                <span style="color:#5D6280;letter-spacing:2px;">???</span> / ${totaalMax}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA sectie -->
        <tr><td style="padding:24px 32px;text-align:center;">
          <p style="color:#B8BDD4;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Maak een gratis account aan om je <strong style="color:#F0F2F8;">volledige resultaten</strong> te bekijken, inclusief je totaalscore en persoonlijke inzichten.
          </p>
          <a href="${registerUrl}" style="display:inline-block;background-color:#2ed573;color:#0D0D14;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;">
            Account aanmaken & resultaten bekijken
          </a>
          <p style="margin:16px 0 0;font-size:12px;color:#5D6280;">
            Gratis — je resultaten worden automatisch aan je profiel gekoppeld.
          </p>
        </td></tr>

        <!-- Fallback link -->
        <tr><td style="padding:0 32px 24px;text-align:center;">
          <a href="${resultsUrl}" style="color:#2ed573;font-size:13px;text-decoration:underline;">
            Of bekijk een preview van je resultaten →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #252538;text-align:center;">
          <p style="color:#5D6280;font-size:11px;margin:0;">© ${new Date().getFullYear()} Radical Recruitment — AI Talent Network</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Bron badge ─────────────────────────────────────────────────────

export function buildBronBadge(bron: string | null | undefined) {
  if (!bron) return "";
  const colors: Record<string, string> = {
    portal: "#3498db",
    tally: "#9b59b6",
    manual: "#95a5a6",
    crm: "#f39c12",
  };
  return BADGE(bron.toUpperCase(), colors[bron] || "#888");
}
