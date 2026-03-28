import nodemailer from "nodemailer";

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
}): Promise<boolean> {
  const transport = createTransport();
  if (!transport) {
    console.warn("[email] SMTP not configured — skipping send");
    return false;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  try {
    await transport.sendMail({
      from,
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
