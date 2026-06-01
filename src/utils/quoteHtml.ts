import { Quote, Company } from '../types';

function fmt(n: number): string {
  return new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(n) + ' kr';
}
function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function generateQuoteHtml(quote: Quote, company: Company | null, approvalUrl?: string): string {
  const linesHtml = quote.lines.map((l) => `
    <tr>
      <td>${l.description}</td>
      <td style="text-align:center;">${l.quantity}</td>
      <td style="text-align:right;">${fmt(l.unitPrice)}</td>
      <td style="text-align:right;">${fmt(l.amount)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <title>Tilbud ${quote.quoteNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color:#1F2937; background:#fff; padding:48px; max-width:760px; margin:0 auto; font-size:14px; line-height:1.5; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
    .company-name { font-size:20px; font-weight:700; color:#0A1B33; }
    .meta { font-size:12px; color:#64748B; margin-top:3px; }
    .quote-label { font-size:28px; font-weight:700; color:#2563FF; text-align:right; }
    .quote-number { font-size:13px; color:#64748B; text-align:right; margin-top:4px; }
    .parties { display:flex; justify-content:space-between; margin:24px 0; padding:16px 0; border-top:1px solid #E2E8F0; border-bottom:1px solid #E2E8F0; }
    .party-label { font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; }
    .party-name { font-size:15px; font-weight:600; color:#0A1B33; }
    .party-detail { font-size:13px; color:#64748B; margin-top:2px; }
    .validity { background:#EEF4FF; border-radius:8px; padding:12px 16px; margin-bottom:24px; font-size:13px; color:#2563FF; }
    .validity strong { font-weight:700; }
    .title-section { margin-bottom:20px; }
    .title { font-size:18px; font-weight:700; color:#0A1B33; }
    .description { font-size:14px; color:#64748B; margin-top:6px; line-height:1.6; }
    .section-label { font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    thead th { text-align:left; font-size:11px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.4px; padding:0 0 10px; border-bottom:1px solid #E2E8F0; }
    thead th:last-child { text-align:right; }
    tbody td { padding:11px 0; border-bottom:1px solid #F1F5F9; font-size:14px; }
    .totals { margin-left:auto; width:280px; }
    .total-row { display:flex; justify-content:space-between; padding:5px 0; font-size:14px; color:#64748B; }
    hr.divider { border:none; border-top:1px solid #E2E8F0; margin:8px 0; }
    .grand-total { display:flex; justify-content:space-between; align-items:center; padding:12px 0; }
    .grand-label { font-size:15px; font-weight:700; color:#0A1B33; }
    .grand-value { font-size:24px; font-weight:700; color:#2563FF; }
    .approval-section { margin-top:32px; padding:24px; background:#F0FDF4; border-radius:12px; text-align:center; }
    .approval-btn { display:inline-block; background:#2563FF; color:#fff; font-size:16px; font-weight:600; padding:14px 32px; border-radius:10px; text-decoration:none; margin-top:12px; }
    .footer { margin-top:40px; padding-top:20px; border-top:1px solid #E2E8F0; color:#94A3B8; font-size:12px; display:flex; justify-content:space-between; }
    @media print { body { padding:0; } @page { margin:2cm; size:A4; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${company?.logoUrl ? `<img src="${company.logoUrl}" alt="Logo" style="height:48px;max-width:140px;object-fit:contain;margin-bottom:8px;display:block;" />` : ''}
      <div class="company-name">${company?.name ?? 'Efero'}</div>
      ${company?.orgNumber ? `<div class="meta">Org.nr: ${company.orgNumber}</div>` : ''}
      ${company?.address ? `<div class="meta">${company.address}</div>` : ''}
    </div>
    <div>
      <div class="quote-label">TILBUD</div>
      <div class="quote-number">${quote.quoteNumber}</div>
      <div class="meta" style="text-align:right;margin-top:4px;">Dato: ${fmtDate(quote.createdAt)}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Tilbud til</div>
      <div class="party-name">${quote.customerName}</div>
      ${quote.customerPhone ? `<div class="party-detail">${quote.customerPhone}</div>` : ''}
      ${quote.customerAddress ? `<div class="party-detail">${quote.customerAddress}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div class="party-label">Fra</div>
      <div class="party-name">${company?.name ?? ''}</div>
    </div>
  </div>

  <div class="validity">
    Tilbudet er gyldig til: <strong>${fmtDate(quote.validUntil)}</strong>
  </div>

  <div class="title-section">
    <div class="title">${quote.title}</div>
    ${quote.description ? `<div class="description">${quote.description}</div>` : ''}
  </div>

  <div class="section-label">Spesifikasjon</div>
  <table>
    <thead>
      <tr>
        <th>Beskrivelse</th>
        <th style="text-align:center;">Antall</th>
        <th style="text-align:right;">Enhetspris</th>
        <th style="text-align:right;">Beløp</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Sum eks. MVA</span><span>${fmt(quote.subtotalExVat)}</span></div>
    <div class="total-row"><span>MVA 25%</span><span>${fmt(quote.vat)}</span></div>
    <hr class="divider" />
    <div class="grand-total">
      <span class="grand-label">Totalt inkl. MVA</span>
      <span class="grand-value">${fmt(quote.totalAmount)}</span>
    </div>
  </div>

  ${approvalUrl ? `
  <div class="approval-section">
    <div style="font-size:15px;font-weight:600;color:#0A1B33;">Godkjenn tilbudet digitalt</div>
    <div style="font-size:13px;color:#64748B;margin-top:6px;">Trykk på knappen nedenfor for å se og godkjenne tilbudet.</div>
    <a href="${approvalUrl}" class="approval-btn">Se og godkjenn tilbud →</a>
  </div>` : ''}

  <div class="footer">
    <span>Betalingsbetingelser: ${company?.paymentTermsDays ?? 14} dager netto.</span>
    <span>Generert av Efero</span>
  </div>
</body>
</html>`;
}
