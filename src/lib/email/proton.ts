/**
 * Proton Mail SMTP helper
 *
 * Alle e-mails worden verstuurd via Proton Mail SMTP (smtp.protonmail.ch).
 * Configuratie: Marketing@radicalrecruitment.ai
 *
 * TODO: Implementatie in volgende fase met nodemailer of vergelijkbaar.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // Placeholder — wordt geïmplementeerd met Proton Mail SMTP
  console.log("[Email] Would send:", options.subject, "to:", options.to);
}
