"use client";

import { jsPDF } from "jspdf";
import type { FactuurRegel } from "@/lib/types/crm";

interface PdfFactuur {
  factuurnummer: string;
  factuurdatum: string;
  vervaldatum: string;
  betaaldatum?: string;
  status: string;
  bedrag: number;
  btw_bedrag: number;
  totaal_bedrag: number;
  regels?: FactuurRegel[];
  notities?: string;
  klant?: {
    bedrijfsnaam: string;
    kvk_nummer?: string;
    btw_nummer?: string;
  } | null;
}

export function generateFactuurPDF(factuur: PdfFactuur) {
  const doc = new jsPDF("p", "mm", "a4");
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 0;

  const SMARAGD = [27, 77, 62] as const;
  const SMARAGD_LIGHT = [46, 213, 115] as const;
  const TEXT_DARK = [20, 20, 25] as const;
  const TEXT_MID = [80, 80, 95] as const;
  const TEXT_LIGHT = [140, 140, 155] as const;
  const BORDER = [220, 220, 228] as const;
  const BG_HEADER = [245, 247, 250] as const;

  void SMARAGD_LIGHT; // used for reference

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, 297, "F");
  doc.setFillColor(...SMARAGD);
  doc.rect(0, 0, W, 8, "F");

  y = 22;

  doc.setFontSize(18);
  doc.setTextColor(...SMARAGD);
  doc.setFont("helvetica", "bold");
  doc.text("radicalAI", margin, y);
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_LIGHT);
  doc.setFont("helvetica", "normal");
  doc.text("Recruitment Bureau", margin, y + 5);

  doc.setFontSize(24);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.text("FACTUUR", W - margin, y, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MID);
  doc.text(factuur.factuurnummer, W - margin, y + 7, { align: "right" });

  const statusColors: Record<string, [number, number, number]> = {
    concept: [150, 150, 165],
    openstaand: [220, 150, 30],
    betaald: [46, 160, 90],
    vervallen: [200, 60, 60],
  };
  const statusColor = statusColors[factuur.status] ?? [150, 150, 165];
  const statusLabel = factuur.status.charAt(0).toUpperCase() + factuur.status.slice(1);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const badgeW = doc.getTextWidth(statusLabel) + 10;
  doc.setFillColor(...statusColor);
  doc.roundedRect(W - margin - badgeW, y + 10, badgeW, 7, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, W - margin - badgeW / 2, y + 15, { align: "center" });

  y += 30;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_LIGHT);
  doc.text("FACTUUR AAN", margin, y);
  doc.text("DETAILS", W - margin - 60, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(factuur.klant?.bedrijfsnaam ?? "—", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MID);
  if (factuur.klant?.kvk_nummer) { doc.text(`KVK: ${factuur.klant.kvk_nummer}`, margin, y); y += 5; }
  if (factuur.klant?.btw_nummer) { doc.text(`BTW: ${factuur.klant.btw_nummer}`, margin, y); y += 5; }

  const dateStartY = y - (factuur.klant?.kvk_nummer ? 10 : 5) - (factuur.klant?.btw_nummer ? 5 : 0);
  const dateX = W - margin - 60;
  const valX = W - margin;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  const dateRows: [string, string][] = [
    ["Factuurdatum:", fmt(factuur.factuurdatum)],
    ["Vervaldatum:", fmt(factuur.vervaldatum)],
    ...(factuur.betaaldatum ? [["Betaald op:", fmt(factuur.betaaldatum)] as [string, string]] : []),
  ];

  let dY = dateStartY;
  for (const [label, value] of dateRows) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_LIGHT);
    doc.text(label, dateX, dY);
    doc.setTextColor(...TEXT_DARK);
    doc.text(value, valX, dY, { align: "right" });
    dY += 5;
  }

  y = Math.max(y, dY) + 8;

  const regels: FactuurRegel[] = factuur.regels?.length
    ? factuur.regels
    : [{ omschrijving: "Recruitment diensten", aantal: 1, eenheidsprijs: factuur.bedrag, btw_percentage: 21 }];

  doc.setFillColor(...BG_HEADER);
  doc.rect(margin, y, contentW, 7, "F");

  const col = {
    omschrijving: margin + 2,
    aantal: margin + contentW * 0.58,
    prijs: margin + contentW * 0.72,
    btw: margin + contentW * 0.84,
    totaal: margin + contentW,
  };

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_LIGHT);
  doc.text("OMSCHRIJVING", col.omschrijving, y + 4.5);
  doc.text("AANTAL", col.aantal, y + 4.5, { align: "right" });
  doc.text("PRIJS", col.prijs, y + 4.5, { align: "right" });
  doc.text("BTW", col.btw, y + 4.5, { align: "right" });
  doc.text("TOTAAL", col.totaal, y + 4.5, { align: "right" });
  y += 9;

  const fmtCur = (v: number) =>
    `€${v.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;

  for (let i = 0; i < regels.length; i++) {
    const r = regels[i];
    const rowTotaal = r.aantal * r.eenheidsprijs;
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 1, contentW, 7, "F");
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.text(doc.splitTextToSize(r.omschrijving, contentW * 0.55)[0], col.omschrijving, y + 4);
    doc.setTextColor(...TEXT_MID);
    doc.text(String(r.aantal), col.aantal, y + 4, { align: "right" });
    doc.text(fmtCur(r.eenheidsprijs), col.prijs, y + 4, { align: "right" });
    doc.text(`${r.btw_percentage}%`, col.btw, y + 4, { align: "right" });
    doc.setTextColor(...TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(fmtCur(rowTotaal), col.totaal, y + 4, { align: "right" });
    y += 7;
  }

  y += 4;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin + contentW * 0.6, y, W - margin, y);
  y += 4;

  const totaalX = margin + contentW * 0.62;
  const totaalValX = W - margin;

  for (const [label, value] of [["Subtotaal", fmtCur(factuur.bedrag)], ["BTW", fmtCur(factuur.btw_bedrag)]]) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_MID);
    doc.text(label, totaalX, y);
    doc.setTextColor(...TEXT_DARK);
    doc.text(value, totaalValX, y, { align: "right" });
    y += 6;
  }

  doc.setFillColor(...SMARAGD);
  doc.rect(totaalX - 4, y - 2, totaalValX - totaalX + 8, 9, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Totaal", totaalX, y + 4.5);
  doc.text(fmtCur(factuur.totaal_bedrag), totaalValX, y + 4.5, { align: "right" });
  y += 14;

  doc.setFillColor(...BG_HEADER);
  doc.rect(margin, y, contentW, 18, "F");
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_LIGHT);
  doc.text("BETAALGEGEVENS", margin + 4, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MID);
  doc.text("Graag het totaalbedrag overmaken onder vermelding van het factuurnummer.", margin + 4, y);
  y += 4;
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Referentie: ${factuur.factuurnummer}`, margin + 4, y);
  y += 10;

  if (factuur.notities) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SMARAGD);
    doc.text("Notities", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_MID);
    const noteLines = doc.splitTextToSize(factuur.notities, contentW);
    doc.text(noteLines, margin, y);
  }

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, 284, W - margin, 284);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_LIGHT);
  doc.text("radicalAI — Recruitment Bureau", margin, 289);
  doc.text(new Date().toLocaleDateString("nl-NL"), W - margin, 289, { align: "right" });

  doc.save(`Factuur_${factuur.factuurnummer}.pdf`);
}
