import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { getNotifiableUsers, type NotificatieKey } from "./emailVoorkeuren";

/**
 * Server-side notificatie helper — kan direct vanuit server actions worden aangeroepen.
 * Stuurt e-mail + in-app notificatie naar alle admins met juiste voorkeur.
 * Fire-and-forget: logt fouten maar gooit niet.
 */
export async function notifyAdmins(opts: {
  key: NotificatieKey;
  subject: string;
  html: string;
  bericht: string;
  link?: string;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    const recipients = await getNotifiableUsers(opts.key);

    await Promise.all(
      recipients.map(async (r) => {
        await sendEmail({ to: r.email, subject: opts.subject, html: opts.html }).catch((err) => console.error("[notifyAdmins] Email failed:", err));
        await supabase
          .from("notificaties")
          .insert({
            user_id: r.id,
            type: "info",
            titel: opts.subject,
            bericht: opts.bericht,
            link: opts.link,
          })
          .then(undefined, (err) => console.error("[notifyAdmins] DB insert failed:", err));
      })
    );
  } catch (err) {
    console.error("[notifyAdmins]", err);
  }
}
