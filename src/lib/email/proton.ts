/**
 * kSuite (Infomaniak) SMTP helper
 *
 * Alle e-mails worden verstuurd via kSuite SMTP (mail.infomaniak.com).
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
  // Placeholder — wordt geïmplementeerd met kSuite SMTP
  console.log("[Email] Would send:", options.subject, "to:", options.to);
}
