import nodemailer from "nodemailer";
import crypto from "crypto";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}): Promise<boolean> {
  const transport = createTransport();
  if (!transport) {
    console.warn("[email] SMTP not configured — skipping send");
    return false;
  }

  const from = opts.from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER;

  try {
    await transport.sendMail({
      from,
      replyTo: opts.replyTo,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err) {
    console.error("[email] Send error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Verification token helpers
// ---------------------------------------------------------------------------

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getVerificationTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 uur geldig
  return expiry;
}

// ---------------------------------------------------------------------------
// Verification email
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(opts: {
  to: string;
  firstName: string;
  token: string;
}): Promise<boolean> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const verifyUrl = `${siteUrl}/auth/verify-email?token=${opts.token}`;

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#0D0D14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D14;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#13131F;border-radius:16px;border:1px solid #252538;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background:rgba(46,213,115,0.1);color:#2ed573;font-size:28px;text-align:center;">✉</div>
          <h1 style="color:#F0F2F8;font-size:22px;margin:16px 0 0;">Welkom bij Radical</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:16px 32px 32px;color:#B8BDD4;font-size:15px;line-height:1.6;">
          <p>Hoi ${opts.firstName},</p>
          <p>Bedankt voor je registratie! Klik op de knop hieronder om je e-mailadres te bevestigen en je account te activeren.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td align="center">
              <a href="${verifyUrl}" style="display:inline-block;background-color:#2ed573;color:#0D0D14;font-weight:700;font-size:15px;padding:12px 32px;border-radius:8px;text-decoration:none;">
                E-mailadres bevestigen
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#5D6280;">Deze link is 24 uur geldig. Werkt de knop niet? Kopieer en plak deze link in je browser:</p>
          <p style="font-size:12px;color:#5D6280;word-break:break-all;">${verifyUrl}</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #252538;text-align:center;">
          <p style="color:#5D6280;font-size:12px;margin:0;">© ${new Date().getFullYear()} Radical Recruitment — AI Talent Network</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `Hoi ${opts.firstName},\n\nBedankt voor je registratie bij Radical! Bevestig je e-mailadres via deze link:\n${verifyUrl}\n\nDeze link is 24 uur geldig.\n\n— Radical Recruitment`;

  return sendEmail({
    to: opts.to,
    subject: "Bevestig je e-mailadres — Radical",
    from: "Nelieke — Radical <info@radicalrecruitment.ai>",
    replyTo: "nelieke@radicalrecruitment.ai",
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// Password reset email
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  token: string;
}): Promise<boolean> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const resetUrl = `${siteUrl}/auth/reset-password?token=${opts.token}`;

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#0D0D14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D14;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#13131F;border-radius:16px;border:1px solid #252538;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background:rgba(46,213,115,0.1);color:#2ed573;font-size:28px;text-align:center;">🔑</div>
          <h1 style="color:#F0F2F8;font-size:22px;margin:16px 0 0;">Wachtwoord resetten</h1>
        </td></tr>
        <tr><td style="padding:16px 32px 32px;color:#B8BDD4;font-size:15px;line-height:1.6;">
          <p>Hoi ${opts.firstName},</p>
          <p>Je hebt een wachtwoord-reset aangevraagd. Klik op de knop hieronder om een nieuw wachtwoord in te stellen.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td align="center">
              <a href="${resetUrl}" style="display:inline-block;background-color:#2ed573;color:#0D0D14;font-weight:700;font-size:15px;padding:12px 32px;border-radius:8px;text-decoration:none;">
                Nieuw wachtwoord instellen
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#5D6280;">Deze link is 1 uur geldig. Heb je geen reset aangevraagd? Dan kun je deze email negeren.</p>
          <p style="font-size:12px;color:#5D6280;word-break:break-all;">${resetUrl}</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #252538;text-align:center;">
          <p style="color:#5D6280;font-size:12px;margin:0;">© ${new Date().getFullYear()} Radical Recruitment — AI Talent Network</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `Hoi ${opts.firstName},\n\nJe hebt een wachtwoord-reset aangevraagd. Stel een nieuw wachtwoord in via:\n${resetUrl}\n\nDeze link is 1 uur geldig.\n\n— Nelieke, Radical Recruitment`;

  return sendEmail({
    to: opts.to,
    subject: "Wachtwoord resetten — Radical",
    from: "Nelieke — Radical <info@radicalrecruitment.ai>",
    replyTo: "nelieke@radicalrecruitment.ai",
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// APAC results email to candidate
// ---------------------------------------------------------------------------

import { buildApacResultsEmailHtml, type ApacScoreInput } from "@/lib/email/templates";

export async function sendApacResultsEmail(opts: {
  to: string;
  firstName: string;
  scores: ApacScoreInput;
  maxScores: ApacScoreInput;
  sessionId: string;
}): Promise<boolean> {
  const html = buildApacResultsEmailHtml({
    firstName: opts.firstName,
    scores: opts.scores,
    maxScores: opts.maxScores,
    sessionId: opts.sessionId,
  });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const text = `Hoi ${opts.firstName},\n\nBedankt voor het maken van de APAC-test! Bekijk je resultaten:\n${siteUrl}/apac/results/${opts.sessionId}\n\nMaak een gratis account aan om je volledige score te zien:\n${siteUrl}/auth/register?session=${opts.sessionId}\n\n— Nelieke, Radical Recruitment`;

  return sendEmail({
    to: opts.to,
    subject: "Je APAC-resultaten — Radical",
    from: "Nelieke — Radical <info@radicalrecruitment.ai>",
    replyTo: "nelieke@radicalrecruitment.ai",
    html,
    text,
  });
}
