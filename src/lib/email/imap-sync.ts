import { ImapFlow } from "imapflow";
import { createServiceClient } from "@/lib/supabase/server";

export function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith("b64:")) {
    return Buffer.from(encrypted.slice(4), "base64").toString("utf-8");
  }
  return encrypted;
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export function extractBodyFromRaw(raw: string): string {
  const headerBodySplit = raw.indexOf("\r\n\r\n") !== -1 ? "\r\n\r\n" : "\n\n";
  const splitIdx = raw.indexOf(headerBodySplit);
  if (splitIdx === -1) return "";

  const headers = raw.slice(0, splitIdx);
  const body = raw.slice(splitIdx + headerBodySplit.length);

  const ctMatch = headers.match(/Content-Type:\s*([^\r\n;]+)/i);
  const ct = ctMatch?.[1]?.trim().toLowerCase() ?? "";

  if (ct.startsWith("multipart/")) {
    const boundaryMatch = headers.match(/boundary="?([^"\r\n;]+)"?/i);
    if (!boundaryMatch) return "";
    const boundary = boundaryMatch[1].trim();
    const parts = body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`));

    for (const part of parts) {
      const partSplitIdx = part.indexOf(headerBodySplit);
      if (partSplitIdx === -1) continue;
      const partHeaders = part.slice(0, partSplitIdx);
      const partBody = part.slice(partSplitIdx + headerBodySplit.length).trim();
      if (!partBody) continue;

      const partCt = partHeaders.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1]?.trim().toLowerCase() ?? "";
      const partEnc = partHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() ?? "";

      if (partCt.startsWith("text/plain")) {
        const decoded = partEnc === "quoted-printable" ? decodeQuotedPrintable(partBody) : partBody;
        return decoded.replace(/\s+/g, " ").trim().slice(0, 500);
      }
    }

    for (const part of parts) {
      const partSplitIdx = part.indexOf(headerBodySplit);
      if (partSplitIdx === -1) continue;
      const partHeaders = part.slice(0, partSplitIdx);
      const partBody = part.slice(partSplitIdx + headerBodySplit.length).trim();
      if (!partBody) continue;

      const partCt = partHeaders.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1]?.trim().toLowerCase() ?? "";
      const partEnc = partHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() ?? "";

      if (partCt.startsWith("text/html")) {
        const decoded = partEnc === "quoted-printable" ? decodeQuotedPrintable(partBody) : partBody;
        return extractTextFromHtml(decoded);
      }
    }
    return "";
  }

  const encMatch = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const enc = encMatch?.[1]?.trim().toLowerCase() ?? "";
  const decoded = enc === "quoted-printable" ? decodeQuotedPrintable(body) : body;

  if (ct.startsWith("text/html")) return extractTextFromHtml(decoded);
  return decoded.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function syncFolder({
  client,
  db,
  folderPath,
  direction,
  portalUserId,
  authUserId,
  username,
  since,
}: {
  client: ImapFlow;
  db: ReturnType<typeof createServiceClient>;
  folderPath: string;
  direction: "sent" | "received";
  portalUserId: string;
  authUserId: string | null;
  username: string;
  since: Date;
}): Promise<number> {
  let synced = 0;
  const lock = await client.getMailboxLock(folderPath);

  try {
    const messages = client.fetch(
      { since },
      { envelope: true, bodyStructure: true, source: true }
    );

    for await (const msg of messages) {
      const messageId = msg.envelope?.messageId;
      if (!messageId) continue;

      const { data: existing } = await db
        .from("imap_sync_state")
        .select("message_id")
        .eq("message_id", messageId)
        .single();

      if (existing) continue;

      const matchAddresses = direction === "sent"
        ? (msg.envelope?.to || []).map((addr) => addr.address?.toLowerCase()).filter(Boolean) as string[]
        : (msg.envelope?.from || []).map((addr) => addr.address?.toLowerCase()).filter(Boolean) as string[];

      if (matchAddresses.length === 0) continue;

      const [{ data: contacten }, { data: kandidaten }] = await Promise.all([
        db
          .from("contactpersonen")
          .select("id, klant_id, email")
          .in("email", matchAddresses),
        db
          .from("kandidaten")
          .select("id, email")
          .in("email", matchAddresses),
      ]);

      const hasMatches =
        (contacten && contacten.length > 0) ||
        (kandidaten && kandidaten.length > 0);

      if (!hasMatches) continue;

      const subject = msg.envelope?.subject || "(geen onderwerp)";
      const from = msg.envelope?.from?.[0]?.address ?? username;
      const toAddresses = (msg.envelope?.to || [])
        .map((addr) => addr.address?.toLowerCase())
        .filter(Boolean) as string[];
      const date = msg.envelope?.date?.toISOString() ?? new Date().toISOString();

      const bodyText = msg.source
        ? extractBodyFromRaw(msg.source.toString("utf-8"))
        : "";

      const beschrijving = direction === "sent"
        ? `Email verzonden: ${subject}`
        : `Email ontvangen: ${subject}`;

      const metadata = {
        subject,
        from,
        to: toAddresses.join(", "),
        date,
        messageId,
        body: bodyText,
        direction,
      };

      const klantIds = [
        ...new Set((contacten || []).map((c) => c.klant_id).filter(Boolean)),
      ] as string[];

      for (const klantId of klantIds) {
        await db.from("activiteiten").insert({
          type: "email",
          beschrijving,
          klant_id: klantId,
          user_id: authUserId,
          metadata,
        });
      }

      for (const kandidaat of kandidaten || []) {
        await db.from("activiteiten").insert({
          type: "email",
          beschrijving,
          kandidaat_id: kandidaat.id,
          user_id: authUserId,
          metadata,
        });
      }

      await db.from("imap_sync_state").insert({
        message_id: messageId,
        synced_by_user_id: portalUserId,
      });

      synced++;
    }
  } finally {
    lock.release();
  }

  return synced;
}

export async function syncMailbox({
  db,
  portalUserId,
  authUserId,
  username,
  password,
  host,
  port,
  lastSyncedAt,
  sinceOverride,
}: {
  db: ReturnType<typeof createServiceClient>;
  portalUserId: string;
  authUserId: string | null;
  username: string;
  password: string;
  host: string;
  port: number;
  lastSyncedAt: string | null;
  sinceOverride?: Date;
}): Promise<number> {
  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: username, pass: password },
    logger: false,
  });

  await client.connect();

  let synced = 0;

  try {
    const since = sinceOverride
      ?? (lastSyncedAt ? new Date(lastSyncedAt) : new Date(Date.now() - 24 * 60 * 60 * 1000));

    const sentFolderNames = ["Sent", "Verzonden", "Sent Messages", "INBOX.Sent"];
    let sentFolder: string | null = null;

    const mailboxes = await client.list();
    for (const folder of mailboxes) {
      if (sentFolderNames.some((n) => folder.name.toLowerCase() === n.toLowerCase())) {
        sentFolder = folder.path;
        break;
      }
      if (folder.specialUse === "\\Sent") {
        sentFolder = folder.path;
        break;
      }
    }

    if (sentFolder) {
      synced += await syncFolder({
        client, db, folderPath: sentFolder, direction: "sent",
        portalUserId, authUserId, username, since,
      });
    } else {
      console.warn(`[email-sync] Geen Verzonden map gevonden voor ${username}`);
    }

    synced += await syncFolder({
      client, db, folderPath: "INBOX", direction: "received",
      portalUserId, authUserId, username, since,
    });
  } finally {
    await client.logout();
  }

  return synced;
}
