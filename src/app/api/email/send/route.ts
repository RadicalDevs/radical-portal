import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { to, subject, html } = body;
  if (!to || !subject || !html) {
    return NextResponse.json(
      { error: "Missende velden: to, subject, html zijn verplicht." },
      { status: 400 }
    );
  }

  try {
    const success = await sendEmail({ to, subject, html });

    if (!success) {
      return NextResponse.json(
        { error: "SMTP niet geconfigureerd. Stel kSuite SMTP in via instellingen." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Email send error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Email verzenden mislukt." },
      { status: 500 }
    );
  }
}
