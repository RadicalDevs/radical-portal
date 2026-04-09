/**
 * CV Text Extraction — PDF en DOCX naar platte tekst
 * Gebruikt pdf-parse (PDF) en mammoth (DOCX).
 */
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Download CV uit Supabase Storage en extraheer tekst.
 * Ondersteunt twee formaten:
 * 1. Relatief pad: "uuid/cv.pdf" → download uit cv-uploads bucket
 * 2. Volledige URL: "https://...supabase.co/storage/v1/object/public/documenten/..." → fetch direct
 */
export async function extractCvText(cvUrl: string): Promise<string | null> {
  let buffer: Buffer;
  let ext: string | undefined;

  try {
    if (cvUrl.startsWith("http")) {
      // Full URL — fetch directly
      const response = await fetch(cvUrl);
      if (!response.ok) {
        console.error("CV download via URL mislukt:", response.status);
        return null;
      }
      buffer = Buffer.from(await response.arrayBuffer());
      // Extract extension from URL (strip query params)
      const urlPath = new URL(cvUrl).pathname;
      ext = urlPath.split(".").pop()?.toLowerCase();
    } else {
      // Relative path — download from cv-uploads bucket
      const supabase = createServiceClient();
      const { data: fileData, error } = await supabase.storage
        .from("cv-uploads")
        .download(cvUrl);

      if (error || !fileData) {
        console.error("CV download uit bucket mislukt:", error?.message);
        return null;
      }
      buffer = Buffer.from(await fileData.arrayBuffer());
      ext = cvUrl.split(".").pop()?.toLowerCase();
    }
  } catch (err) {
    console.error("CV download fout:", err);
    return null;
  }

  try {
    if (ext === "pdf") {
      return await extractFromPdf(buffer);
    } else if (ext === "docx" || ext === "doc") {
      return await extractFromDocx(buffer);
    } else {
      console.warn(`Onbekend CV formaat: .${ext}`);
      return null;
    }
  } catch (err) {
    console.error("CV tekst extractie mislukt:", err);
    return null;
  }
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  // Import pdf-parse internals directly to avoid the test-mode code in index.js
  // that does fs.readFileSync('./test/data/...') which crashes in Next.js bundler
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return cleanExtractedText(result.text);
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return cleanExtractedText(result.value);
}

/**
 * Opschonen van geëxtraheerde tekst:
 * - Verwijder excessieve witruimte
 * - Trim tot max 15.000 karakters (past binnen LLM context)
 */
function cleanExtractedText(text: string): string {
  const MAX_LENGTH = 15_000;
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return cleaned.slice(0, MAX_LENGTH);
}
