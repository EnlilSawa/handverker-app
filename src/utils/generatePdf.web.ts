// Web-specific PDF generation using jsPDF (no print dialog)
import { jsPDF } from 'jspdf';
import { Invoice, Company } from '../types';

function fmt(n: number): string {
  return new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(n) + ' kr';
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Sendt', paid: 'Betalt', overdue: 'Forfalt',
};

function buildDoc(invoice: Invoice, company: Company | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210;
  const lm = 20;
  const rm = pageW - 20;
  const colMid = pageW / 2;
  let y = 22;

  const gray = '#64748B';
  const navy = '#0A1B33';
  const blue = '#2563FF';
  const lineGray = '#E2E8F0';
  const lightLine = '#F1F5F9';

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(navy);
  doc.text(company?.name ?? 'Efero', lm, y);

  doc.setFontSize(15);
  doc.text(invoice.invoiceNumber, rm, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(gray);
  if (company?.orgNumber) { doc.text(`Org.nr: ${company.orgNumber}`, lm, y); y += 4; }
  if (company?.address)   { doc.text(company.address, lm, y); y += 4; }

  doc.setFontSize(10);
  doc.text(STATUS_LABEL[invoice.status] ?? invoice.status, rm, y - 2, { align: 'right' });

  y += 6;
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
  doc.text('FAKTURADATO', lm, y);
  doc.text('FORFALL', colMid + 5, y);
  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(navy);
  doc.text(fmtDate(invoice.createdAt), lm, y);
  doc.text(fmtDate(invoice.dueDate), colMid + 5, y);
  y += 7;

  doc.setDrawColor(lineGray);
  doc.line(lm, y, rm, y);
  y += 7;

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

  // ── Note ─────────────────────────────────────────────────────────────────
  if (invoice.note) {
    y += 6;
    doc.setDrawColor(lineGray);
    doc.setLineWidth(0.3);
    doc.line(lm, y, rm, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gray);
    doc.text('NOTAT', lm, y);
    y += 4;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor('#1F2937');
    const noteLines = doc.splitTextToSize(invoice.note, rm - lm);
    doc.text(noteLines, lm, y);
    y += noteLines.length * 5;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const fy = 272;
  doc.setDrawColor(lineGray);
  doc.setLineWidth(0.3);
  doc.line(lm, fy, rm, fy);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray);
  doc.text(
    `Betalingsbetingelser: ${company?.paymentTermsDays ?? 14} dager netto.`,
    lm, fy + 5
  );
  doc.text('Generert av Efero', rm, fy + 5, { align: 'right' });

  return doc;
}

export async function viewInvoicePdf(invoice: Invoice, company: Company | null): Promise<void> {
  const doc = buildDoc(invoice, company);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadInvoicePdf(invoice: Invoice, company: Company | null): Promise<void> {
  const doc = buildDoc(invoice, company);
  doc.save(`faktura-${invoice.invoiceNumber}.pdf`);
}
