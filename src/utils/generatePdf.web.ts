// Web-specific PDF generation using jsPDF (no print dialog)
import { jsPDF } from 'jspdf';
import { Invoice, Company } from '../types';
// Delt pdf-trygg beløpsformatter — jsPDF-fontene mangler U+2212 (typografisk minus),
// så negative beløp (kreditnota) MÅ formateres med vanlig bindestrek. Se formatters.ts.
import { formatPlainAmount as fmtNum } from './formatters';
import { InvoicePdfExtras } from './invoiceHtml';

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

// Norsk standardoppsett: kunde øverst til venstre (vinduskonvolutt), logo +
// firmainfo øverst til høyre, dokumentblokk (FAKTURA/KREDITNOTA + nøkkelfelt +
// betalingsinformasjon) på høyre side, linjetabell med mva-kolonner, og
// bunnlinje «Betales til bankkonto …» / «NOK <total>» adskilt med strek.
async function buildDoc(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
  extras?: InvoicePdfExtras,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210;
  const lm = 20;
  const rm = pageW - 20;

  const gray = '#64748B';
  const lightGray = '#94A3B8';
  const navy = '#0A1B33';
  const purple = '#7C3AED';
  const lineGray = '#E2E8F0';
  const lightLine = '#F1F5F9';

  // Kreditnota (credits_invoice_id satt): eget dokumenthode, ingen betalingsinfo.
  const isCreditNote = !!invoice.creditsInvoiceId;
  const showKid = !isCreditNote && !!invoice.kid;

  // ── Høyre kolonne: logo + firmainfo ───────────────────────────────────────
  let ry = 16;
  if (company?.logoUrl) {
    const base64 = await loadImageAsBase64(company.logoUrl);
    if (base64) {
      const imgType = base64.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(base64, imgType, rm - 40, ry, 40, 14);
      ry += 18;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(navy);
  doc.text(company?.name ?? 'Efero', rm, ry + 4, { align: 'right' });
  ry += 8.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(gray);
  if (company?.address)   { doc.text(company.address, rm, ry, { align: 'right' }); ry += 4.5; }
  if (company?.orgNumber) { doc.text(`Org.nr: NO ${company.orgNumber} MVA`, rm, ry, { align: 'right' }); ry += 4.5; }
  if (company?.email)     { doc.text(company.email, rm, ry, { align: 'right' }); ry += 4.5; }

  // ── Venstre kolonne: kunde (vinduskonvolutt-posisjon) ─────────────────────
  let ly = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navy);
  doc.text(invoice.customerName, lm, ly);
  ly += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#1F2937');
  if (invoice.customerAddress) {
    const addrLines = doc.splitTextToSize(invoice.customerAddress, 80);
    doc.text(addrLines, lm, ly);
    ly += addrLines.length * 4.5;
  }

  // Venstre midtblokk: leveringsadresse (jobbadressen) + vår kontakt — når data finnes.
  const midBlock = (label: string, value: string) => {
    ly += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(lightGray);
    doc.text(label.toUpperCase(), lm, ly);
    ly += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#1F2937');
    const lines = doc.splitTextToSize(value, 80);
    doc.text(lines, lm, ly);
    ly += lines.length * 4.5;
  };
  if (extras?.deliveryAddress) midBlock('Leveringsadresse', extras.deliveryAddress);
  if (extras?.ourContact)      midBlock('Vår kontakt', extras.ourContact);

  // ── Høyre dokumentblokk: tittel + nøkkelfelt + betalingsinformasjon ───────
  ry += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(isCreditNote ? purple : navy);
  doc.text(isCreditNote ? 'KREDITNOTA' : 'FAKTURA', rm, ry, { align: 'right' });
  ry += 4;

  // Status (kun vanlige fakturaer — kreditnotaens tittel sier alt).
  if (!isCreditNote) {
    ry += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(gray);
    doc.text(STATUS_LABEL[invoice.status] ?? invoice.status, rm, ry, { align: 'right' });
  }
  ry += 6;

  // Label/verdi-par, høyrestilt blokk.
  const labelX = 126;
  const kvRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(gray);
    doc.text(label, labelX, ry);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(navy);
    doc.text(value, rm, ry, { align: 'right' });
    ry += 5;
  };

  kvRow(isCreditNote ? 'Kreditnotanr.' : 'Fakturanr.', invoice.invoiceNumber, true);
  kvRow(isCreditNote ? 'Dato' : 'Fakturadato', fmtDate(invoice.createdAt));

  if (!isCreditNote) {
    // Betalingsinformasjon-blokk med skillelinje.
    ry += 2;
    doc.setDrawColor(lineGray);
    doc.setLineWidth(0.3);
    doc.line(labelX, ry, rm, ry);
    ry += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(navy);
    doc.text('Betalingsinformasjon', labelX, ry);
    ry += 5.5;

    kvRow('Forfallsdato', fmtDate(invoice.dueDate));
    if (company?.accountNumber) kvRow('Kontonummer', company.accountNumber, true);
    if (showKid) kvRow('KID', invoice.kid!, true);

    ry += 1;
    if (showKid) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(navy);
      const nbLines = doc.splitTextToSize('NB! Oppgi alltid KID ved elektronisk betaling.', rm - labelX);
      doc.text(nbLines, rm, ry, { align: 'right' });
      ry += nbLines.length * 4;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(gray);
      const markLines = doc.splitTextToSize(`Merk betalingen med fakturanummer ${invoice.invoiceNumber}`, rm - labelX);
      doc.text(markLines, rm, ry, { align: 'right' });
      ry += markLines.length * 4;
    }

    // Kreditert original: referanse til kreditnotaen.
    if (invoice.status === 'credited' && linkedInvoiceNumber) {
      ry += 2;
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(9);
      doc.setTextColor(gray);
      doc.text(`Kreditert av ${linkedInvoiceNumber}`, rm, ry, { align: 'right' });
      ry += 4.5;
    }
  } else {
    // Kreditnota: referanse + obligatorisk årsak (v36) i stedet for betalingsinfo.
    ry += 2;
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9.5);
    doc.setTextColor(purple);
    doc.text(
      linkedInvoiceNumber ? `Krediterer faktura ${linkedInvoiceNumber}` : 'Krediterer originalfakturaen',
      rm, ry, { align: 'right' },
    );
    ry += 5;
    if (invoice.creditReason) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(gray);
      const reasonLines = doc.splitTextToSize(`Årsak: ${invoice.creditReason}`, rm - labelX);
      doc.text(reasonLines, rm, ry, { align: 'right' });
      ry += reasonLines.length * 4.5;
    }
  }

  // ── Linjetabell ───────────────────────────────────────────────────────────
  let y = Math.max(ly, ry) + 12;

  // Kolonner: beskrivelse venstre, fire høyrestilte tallkolonner.
  const unitR = 120;
  const exR = 144;
  const vatR = 166;
  const inclR = rm;
  const descW = 82;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(gray);
  doc.text('BESKRIVELSE', lm, y);
  doc.text('ENH.PRIS', unitR, y, { align: 'right' });
  doc.text('BELØP', exR, y, { align: 'right' });
  doc.text('MVA', vatR, y, { align: 'right' });
  doc.text('BELØP', inclR, y, { align: 'right' });
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray);
  doc.text('(ekskl. mva)', unitR, y, { align: 'right' });
  doc.text('(ekskl. mva)', exR, y, { align: 'right' });
  doc.text('(25 %)', vatR, y, { align: 'right' });
  doc.text('(inkl. mva)', inclR, y, { align: 'right' });
  y += 2.5;
  doc.setDrawColor(lineGray);
  doc.setLineWidth(0.3);
  doc.line(lm, y, rm, y);
  y += 5.5;

  // Mva/inkl. beregnes per linje (25 %); sum-raden bruker fakturaens totaler.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor('#1F2937');
  for (const item of invoice.lineItems) {
    const descLines = doc.splitTextToSize(item.description, descW);
    doc.text(descLines, lm, y);
    if (item.unitPrice != null) doc.text(fmtNum(item.unitPrice), unitR, y, { align: 'right' });
    doc.text(fmtNum(item.amount), exR, y, { align: 'right' });
    doc.text(fmtNum(item.amount * 0.25), vatR, y, { align: 'right' });
    doc.text(fmtNum(item.amount * 1.25), inclR, y, { align: 'right' });
    y += descLines.length * 4.5 + 1;
    doc.setDrawColor(lightLine);
    doc.setLineWidth(0.2);
    doc.line(lm, y, rm, y);
    y += 4.5;
  }

  // Note — rett under linjepostene
  if (invoice.note) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(gray);
    const noteLines = doc.splitTextToSize(invoice.note, rm - lm);
    doc.text(noteLines, lm, y);
    y += noteLines.length * 4.5 + 1;
    doc.setDrawColor(lightLine);
    doc.setLineWidth(0.2);
    doc.line(lm, y, rm, y);
    y += 4.5;
  }

  // Sum-rad: Sum ekskl. mva / MVA / totalsum under sine kolonner.
  y += 1;
  doc.setDrawColor(navy);
  doc.setLineWidth(0.5);
  doc.line(lm, y, rm, y);
  y += 5.5;
  // Nullstill font — note-blokken over kan ha satt italic (sticky jsPDF-state).
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(navy);
  doc.text('Sum', lm, y);
  doc.text(fmtNum(invoice.subtotalExVat), exR, y, { align: 'right' });
  doc.text(fmtNum(invoice.vat), vatR, y, { align: 'right' });
  doc.text(fmtNum(invoice.total), inclR, y, { align: 'right' });

  // ── Bunnlinje: betalingslinje + NOK-total RETT under Sum-raden ────────────
  // Følger innholdet (norsk standardoppsett), ikke arket — strek + litt luft.
  y += 8;
  doc.setDrawColor(navy);
  doc.setLineWidth(0.5);
  doc.line(lm, y, rm, y);
  y += 7;

  // Kreditnota er ikke et betalingskrav → ingen betalingslinje.
  if (!isCreditNote && company?.accountNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(navy);
    doc.text(
      `Betales til bankkonto ${company.accountNumber}${showKid ? `, KID: ${invoice.kid}` : ''}`,
      lm, y,
    );
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(navy);
  doc.text(`NOK ${fmtNum(invoice.total)}`, rm, y, { align: 'right' });

  // Diskret signatur nederst på arket.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(lightGray);
  doc.text('Generert av Efero', rm, 285, { align: 'right' });

  return doc;
}

export async function viewInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
  extras?: InvoicePdfExtras,
): Promise<void> {
  // Open blank window synchronously (before any async work) to avoid popup blocker
  const win = window.open('', '_blank');
  if (!win) throw new Error('Popup ble blokkert av nettleseren. Tillat popups for denne siden.');

  const doc = await buildDoc(invoice, company, linkedInvoiceNumber, extras);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  win.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
  extras?: InvoicePdfExtras,
): Promise<void> {
  const doc = await buildDoc(invoice, company, linkedInvoiceNumber, extras);
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
  extras?: InvoicePdfExtras,
): Promise<string> {
  const doc = await buildDoc(invoice, company, linkedInvoiceNumber, extras);
  const dataUri = doc.output('datauristring'); // data:application/pdf;...;base64,XXXX
  return dataUri.substring(dataUri.indexOf('base64,') + 'base64,'.length);
}
