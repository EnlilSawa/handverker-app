import { Invoice, Company } from '../types';

function fmt(amount: number): string {
  return new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(amount) + ' kr';
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Sendt',
  paid: 'Betalt',
  overdue: 'Forfalt',
};

const STATUS_COLOR: Record<string, string> = {
  sent: '#2563FF',
  paid: '#15803D',
  overdue: '#DC2626',
};

const STATUS_BG: Record<string, string> = {
  sent: '#EEF4FF',
  paid: '#F0FDF4',
  overdue: '#FEF2F2',
};

export function generateInvoiceHtml(invoice: Invoice, company: Company | null): string {
  const lineItemsHtml = invoice.lineItems
    .map(
      (item) => `
      <tr>
        <td>${item.description}</td>
        <td class="right">${fmt(item.amount)}</td>
      </tr>`
    )
    .join('');

  const statusLabel = STATUS_LABEL[invoice.status] ?? invoice.status;
  const statusColor = STATUS_COLOR[invoice.status] ?? '#64748B';
  const statusBg = STATUS_BG[invoice.status] ?? '#F1F5F9';

  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <title>Faktura ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #1F2937;
      background: #ffffff;
      padding: 48px;
      max-width: 760px;
      margin: 0 auto;
      font-size: 14px;
      line-height: 1.5;
    }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-name { font-size: 22px; font-weight: 700; color: #0A1B33; }
    .company-detail { font-size: 13px; color: #64748B; margin-top: 3px; }
    .invoice-meta { text-align: right; }
    .invoice-number { font-size: 18px; font-weight: 700; color: #0A1B33; }
    .status-badge {
      display: inline-block; margin-top: 8px;
      padding: 4px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
      color: ${statusColor}; background: ${statusBg};
    }

    /* From/To */
    .parties { display: flex; justify-content: space-between; margin-bottom: 28px; }
    .party { }
    .party-right { text-align: right; }
    .party-label {
      font-size: 10px; font-weight: 700; color: #94A3B8;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;
    }
    .party-name { font-size: 15px; font-weight: 600; color: #0A1B33; }
    .party-detail { font-size: 13px; color: #64748B; margin-top: 2px; }

    /* Dates */
    .dates {
      display: flex; gap: 40px; margin-bottom: 28px;
      padding: 14px 0; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;
    }
    .date-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .date-value { font-size: 14px; font-weight: 500; color: #1F2937; }

    /* Line items */
    .section-title {
      font-size: 10px; font-weight: 700; color: #94A3B8;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th {
      text-align: left; font-size: 11px; font-weight: 600; color: #64748B;
      text-transform: uppercase; letter-spacing: 0.4px;
      padding: 0 0 10px; border-bottom: 1px solid #E2E8F0;
    }
    thead th.right { text-align: right; }
    tbody td { padding: 11px 0; border-bottom: 1px solid #F1F5F9; }
    tbody td.right { text-align: right; }

    /* Totals */
    .totals-section { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; color: #64748B; font-size: 14px; }
    hr.divider { border: none; border-top: 1px solid #E2E8F0; margin: 10px 0; }
    .grand-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; }
    .grand-label { font-size: 14px; font-weight: 700; color: #0A1B33; }
    .grand-value { font-size: 26px; font-weight: 700; color: #2563FF; }

    /* Footer */
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #E2E8F0; color: #94A3B8; font-size: 12px; }
    .footer p + p { margin-top: 4px; }

    @media print {
      body { padding: 0; }
      @page { margin: 2cm; size: A4; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${company?.name ?? 'Efero'}</div>
      ${company?.orgNumber ? `<div class="company-detail">Org.nr: ${company.orgNumber}</div>` : ''}
      ${company?.address ? `<div class="company-detail">${company.address}</div>` : ''}
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <span class="status-badge">${statusLabel}</span>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">Fakturert til</div>
      <div class="party-name">${invoice.customerName}</div>
      ${invoice.customerAddress ? `<div class="party-detail">${invoice.customerAddress}</div>` : ''}
    </div>
    <div class="party party-right">
      <div class="party-label">Fra</div>
      <div class="party-name">${company?.name ?? ''}</div>
    </div>
  </div>

  <!-- Dates -->
  <div class="dates">
    <div>
      <div class="date-label">Fakturadato</div>
      <div class="date-value">${fmtDate(invoice.createdAt)}</div>
    </div>
    <div>
      <div class="date-label">Forfall</div>
      <div class="date-value">${fmtDate(invoice.dueDate)}</div>
    </div>
  </div>

  <!-- Line items -->
  <div class="section-title">Spesifikasjon</div>
  <table>
    <thead>
      <tr>
        <th>Beskrivelse</th>
        <th class="right">Beløp</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-section">
    <div class="total-row"><span>Sum eks. MVA</span><span>${fmt(invoice.subtotalExVat)}</span></div>
    <div class="total-row"><span>MVA 25%</span><span>${fmt(invoice.vat)}</span></div>
    <hr class="divider" />
    <div class="grand-row">
      <span class="grand-label">Totalt inkl. MVA</span>
      <span class="grand-value">${fmt(invoice.total)}</span>
    </div>
  </div>

  ${invoice.note ? `
  <!-- Note -->
  <div style="margin-top: 24px; padding: 14px 16px; background: #F8FAFC; border-radius: 8px; border-left: 3px solid #E2E8F0;">
    <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Notat</div>
    <div style="font-size: 13px; color: #1F2937; font-style: italic; line-height: 1.5;">${invoice.note}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <p>Betalingsbetingelser: ${company?.paymentTermsDays ?? 14} dager netto.</p>
    <p>Generert av Efero</p>
  </div>
</body>
</html>`;
}
