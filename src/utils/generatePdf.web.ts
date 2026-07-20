// Web-specific PDF generation using jsPDF (no print dialog)
import { jsPDF } from 'jspdf';
import { Invoice, Company } from '../types';
// Delt pdf-trygg beløpsformatter — jsPDF-fontene mangler U+2212 (typografisk minus),
// så negative beløp (kreditnota) MÅ formateres med vanlig bindestrek. Se formatters.ts.
import { formatInvoiceAmount as fmt } from './formatters';

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Sendt', paid: 'Betalt', overdue: 'Forfalt', credited: 'Kreditert',
};

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function buildDoc(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210;
  const lm = 20;
  const rm = pageW - 20;
  const colMid = pageW / 2;
  let y = 22;

  const gray = '#64748B';
  const navy = '#0A1B33';
  const blue = '#2563FF';
  const purple = '#7C3AED';
  const lineGray = '#E2E8F0';
  const lightLine = '#F1F5F9';

  // Kreditnota (credits_invoice_id satt): eget dokumenthode, ingen betalingsfrist.
  const isCreditNote = !!invoice.creditsInvoiceId;

  // ── Header ────────────────────────────────────────────────────────────────

  // Invoice number — right side, top-aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(navy);
  doc.text(invoice.invoiceNumber, rm, y, { align: 'right' });
  const numberY = y; // posisjon for fakturanummeret — status legges alltid UNDER dette

  // Left side: logo (if any) then company name
  if (company?.logoUrl) {
    const base64 = await loadImageAsBase64(company.logoUrl);
    if (base64) {
      const imgType = base64.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(base64, imgType, lm, y - 8, 40, 14);
      y += 8 + 8; // logo visual bottom + marginBottom: 8
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(navy);
  doc.text(company?.name ?? 'Efero', lm, y);

  // Status badge — right side, ALLTID under fakturanummeret (unngår overlapp når firma mangler logo).
  // Kreditnota: dokumenttypen ERSTATTER status («KREDITNOTA» i stedet for f.eks. «Sendt»).
  if (isCreditNote) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(purple);
    doc.text('KREDITNOTA', rm, numberY + 6, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(gray);
    doc.text(STATUS_LABEL[invoice.status] ?? invoice.status, rm, numberY + 6, { align: 'right' });
  }

  // Org.nr and address — same spacing as between other lines
  y += 6;
  if (company?.orgNumber) { doc.text(`Org.nr: ${company.orgNumber}`, lm, y); y += 4; }
  if (company?.address)   { doc.text(company.address, lm, y); y += 4; }

  // Total padding under header block: 24px
  y += 24;
  doc.setDrawColor(lineGray);
  doc.setLineWidth(0.3);
  doc.line(lm, y, rm, y);
  y += 7;

  // ── From / To ─────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gray);
  doc.text('FRA', lm, y);
  doc.text('TIL', colMid + 5, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(navy);
  doc.text(company?.name ?? '', lm, y);
  doc.text(invoice.customerName, colMid + 5, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(gray);
  if (company?.orgNumber)      doc.text(`Org.nr: ${company.orgNumber}`, lm, y);
  if (invoice.customerAddress) doc.text(invoice.customerAddress, colMid + 5, y);
  y += 10;

  // ── Dates ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(lineGray);
  doc.line(lm, y, rm, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gray);
  doc.text(isCreditNote ? 'DATO' : 'FAKTURADATO', lm, y);
  // Kreditnota har ingen betalingsfrist → ingen FORFALL-kolonne.
  if (!isCreditNote) doc.text('FORFALL', colMid + 5, y);
  if (company?.accountNumber) doc.text('KONTONUMMER', rm, y, { align: 'right' });
  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(navy);
  doc.text(fmtDate(invoice.createdAt), lm, y);
  if (!isCreditNote) doc.text(fmtDate(invoice.dueDate), colMid + 5, y);
  if (company?.accountNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(company.accountNumber, rm, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }
  y += 7;

  doc.setDrawColor(lineGray);
  doc.line(lm, y, rm, y);
  y += 7;

  // Kobling kreditnota↔original: «Krediterer faktura X» / «Kreditert av X».
  const refLine = isCreditNote
    ? linkedInvoiceNumber
      ? `Krediterer faktura ${linkedInvoiceNumber}`
      : 'Krediterer originalfakturaen'
    : invoice.status === 'credited' && linkedInvoiceNumber
      ? `Kreditert av ${linkedInvoiceNumber}`
      : null;
  if (refLine) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(isCreditNote ? purple : gray);
    doc.text(refLine, lm, y);
    y += 7;
  }

  // Årsak — obligatorisk på kreditnotaer (v36), rett under referanselinjen.
  if (isCreditNote && invoice.creditReason) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray);
    const reasonLines = doc.splitTextToSize(`Årsak: ${invoice.creditReason}`, rm - lm);
    doc.text(reasonLines, lm, y);
    y += reasonLines.length * 5 + 2;
  }

  // ── Line items ────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gray);
  doc.text('SPESIFIKASJON', lm, y);
  doc.text('BELØP', rm, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(lineGray);
  doc.line(lm, y, rm, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor('#1F2937');
  for (const item of invoice.lineItems) {
    doc.text(item.description, lm, y);
    doc.text(fmt(item.amount), rm, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(lightLine);
    doc.setLineWidth(0.2);
    doc.line(lm, y, rm, y);
    y += 3;
  }

  // Note — rett under linjepostene
  if (invoice.note) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(gray);
    const noteLines = doc.splitTextToSize(invoice.note, rm - lm);
    doc.text(noteLines, lm, y);
    y += noteLines.length * 5;
    doc.setDrawColor(lightLine);
    doc.setLineWidth(0.2);
    doc.line(lm, y, rm, y);
    y += 3;
  }

  y += 4;

  // ── Totals ────────────────────────────────────────────────────────────────
  const tx = rm - 65;

  doc.setFontSize(10);
  doc.setTextColor(gray);
  doc.text('Sum eks. MVA', tx, y);
  doc.text(fmt(invoice.subtotalExVat), rm, y, { align: 'right' });
  y += 6;

  doc.text('MVA 25%', tx, y);
  doc.text(fmt(invoice.vat), rm, y, { align: 'right' });
  y += 3;

  doc.setDrawColor(navy);
  doc.setLineWidth(0.5);
  doc.line(tx, y, rm, y);
  y += 6;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy);
  doc.text('Totalt inkl. MVA', tx, y);
  doc.setTextColor(blue);
  doc.text(fmt(invoice.total), rm, y, { align: 'right' });

  // ── Footer ────────────────────────────────────────────────────────────────
  const fy = 265;
  doc.setDrawColor(lineGray);
  doc.setLineWidth(0.3);
  doc.line(lm, fy, rm, fy);

  // Kontonummer ved siden av Forfall (høyre side i header) — allerede håndtert der
  // Footer: kun "Generert av Efero"
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray);
  doc.text('Generert av Efero', rm, fy + 6, { align: 'right' });
  // Kreditnota er ikke et betalingskrav → ingen betalingsfrist.
  if (!isCreditNote) {
    doc.text(`Betalingsfrist: ${company?.paymentTermsDays ?? 14} dager netto`, lm, fy + 6);
  }

  return doc;
}

export async function viewInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
): Promise<void> {
  // Open blank window synchronously (before any async work) to avoid popup blocker
  const win = window.open('', '_blank');
  if (!win) throw new Error('Popup ble blokkert av nettleseren. Tillat popups for denne siden.');

  const doc = await buildDoc(invoice, company, linkedInvoiceNumber);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  win.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
): Promise<void> {
  const doc = await buildDoc(invoice, company, linkedInvoiceNumber);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  // Use anchor click — works after async operations, no popup blocker
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.creditsInvoiceId ? 'kreditnota' : 'faktura'}-${invoice.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// Returns the invoice PDF as base64 (no data: prefix) for e-mail attachment.
export async function generateInvoicePdfBase64(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
): Promise<string> {
  const doc = await buildDoc(invoice, company, linkedInvoiceNumber);
  const dataUri = doc.output('datauristring'); // data:application/pdf;...;base64,XXXX
  return dataUri.substring(dataUri.indexOf('base64,') + 'base64,'.length);
}
