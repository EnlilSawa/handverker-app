import { Invoice, Company } from '../types';
// Delt pdf-trygg beløpsformatter (vanlig bindestrek for negative tall — kreditnota).
// fmt = med «kr»-suffiks (brukes ikke i tabellen), fmtNum = rent tall to desimaler.
import { formatPlainAmount as fmtNum } from './formatters';

// Valgfrie tilleggsdata fra jobben — vises i venstre midtblokk når de finnes.
export interface InvoicePdfExtras {
  /** Jobbadressen (leveringsadresse). */
  deliveryAddress?: string | null;
  /** Tildelt tekniker («Vår kontakt»). */
  ourContact?: string | null;
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
  credited: 'Kreditert',
};

const STATUS_COLOR: Record<string, string> = {
  sent: '#2563FF',
  paid: '#15803D',
  overdue: '#DC2626',
  credited: '#64748B',
};

const STATUS_BG: Record<string, string> = {
  sent: '#EEF4FF',
  paid: '#F0FDF4',
  overdue: '#FEF2F2',
  credited: '#F1F5F9',
};

// Norsk standardoppsett: kunde øverst til venstre (vinduskonvolutt), logo +
// firmainfo øverst til høyre, dokumentblokk med nøkkelfelt og betalings-
// informasjon på høyre side, linjetabell med mva-kolonner, og bunnlinje
// «Betales til bankkonto …» / «NOK <total>».
export function generateInvoiceHtml(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
  extras?: InvoicePdfExtras,
): string {
  // Kreditnota (credits_invoice_id satt): «KREDITNOTA»-tittel, referanse til
  // originalen + årsak, ingen betalingsinformasjon (ikke et betalingskrav).
  const isCreditNote = !!invoice.creditsInvoiceId;
  const statusLabel = isCreditNote ? 'Kreditnota' : (STATUS_LABEL[invoice.status] ?? invoice.status);
  const statusColor = isCreditNote ? '#7C3AED' : (STATUS_COLOR[invoice.status] ?? '#64748B');
  const statusBg = isCreditNote ? '#F5F3FF' : (STATUS_BG[invoice.status] ?? '#F1F5F9');
  const showKid = !isCreditNote && !!invoice.kid;

  // Linjetabell: Enh.pris/Beløp ekskl. mva fra linjedata; mva- og inkl.-kolonnen
  // beregnes per linje (25 %) — sum-raden bruker fakturaens autoritative totaler.
  const lineItemsHtml = invoice.lineItems
    .map(
      (item) => `
      <tr>
        <td>${item.description}</td>
        <td class="num">${item.unitPrice != null ? fmtNum(item.unitPrice) : ''}</td>
        <td class="num">${fmtNum(item.amount)}</td>
        <td class="num">${fmtNum(item.amount * 0.25)}</td>
        <td class="num">${fmtNum(item.amount * 1.25)}</td>
      </tr>`
    )
    .join('');

  const refLine = isCreditNote
    ? linkedInvoiceNumber
      ? `Krediterer faktura ${linkedInvoiceNumber}`
      : 'Krediterer originalfakturaen'
    : invoice.status === 'credited' && linkedInvoiceNumber
      ? `Kreditert av ${linkedInvoiceNumber}`
      : null;

  // Bunnlinje (aldri på kreditnota): «Betales til bankkonto <kontonr>, KID: <kid>».
  const payLine = !isCreditNote && company?.accountNumber
    ? `Betales til bankkonto ${company.accountNumber}${showKid ? `, KID: ${invoice.kid}` : ''}`
    : '';

  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <title>${isCreditNote ? 'Kreditnota' : 'Faktura'} ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #1F2937;
      background: #ffffff;
      padding: 40px 48px;
      max-width: 760px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.45;
    }

    /* To kolonner: kunde/levering/kontakt til venstre, logo/firma/dokumentblokk til høyre */
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
    .top-left { max-width: 46%; }
    .top-right { text-align: right; max-width: 50%; }

    .customer-name { font-size: 15px; font-weight: 700; color: #0A1B33; }
    .customer-detail { font-size: 13px; color: #1F2937; }

    .block-label {
      font-size: 10px; font-weight: 700; color: #94A3B8;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;
    }
    .mid-block { margin-top: 18px; }

    .company-info { font-size: 12px; color: #64748B; margin-top: 6px; }
    .company-info .company-name { font-size: 13px; font-weight: 700; color: #0A1B33; }

    .doc-title { font-size: 26px; font-weight: 700; letter-spacing: 1px; color: #0A1B33; margin-top: 16px; }
    .doc-title.credit { color: #7C3AED; }
    .status-badge {
      display: inline-block; margin-top: 6px;
      padding: 3px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
      color: ${statusColor}; background: ${statusBg};
    }

    .kv { margin-top: 10px; font-size: 13px; }
    .kv-row { display: flex; justify-content: flex-end; gap: 12px; padding: 1px 0; }
    .kv-label { color: #64748B; }
    .kv-value { color: #0A1B33; min-width: 110px; text-align: right; }
    .kv-value.strong { font-weight: 700; }

    .payinfo { margin-top: 12px; padding-top: 8px; border-top: 1px solid #E2E8F0; }
    .payinfo-title { font-size: 13px; font-weight: 700; color: #0A1B33; margin-bottom: 2px; }
    .kid-nb { margin-top: 6px; font-size: 12px; font-weight: 700; color: #0A1B33; }
    .mark-payment { margin-top: 6px; font-size: 12px; color: #64748B; }

    .credit-ref { margin-top: 12px; font-size: 13px; font-weight: 600; font-style: italic; color: #7C3AED; }
    .credit-reason { margin-top: 4px; font-size: 12px; color: #64748B; }
    .credited-by { margin-top: 6px; font-size: 12px; font-weight: 600; font-style: italic; color: #64748B; }

    /* Linjetabell */
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    thead th {
      text-align: right; font-size: 10px; font-weight: 700; color: #64748B;
      text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.3;
      padding: 0 0 8px 12px; border-bottom: 1px solid #E2E8F0; vertical-align: bottom;
    }
    thead th.desc { text-align: left; padding-left: 0; }
    thead th .sub { display: block; font-weight: 500; text-transform: none; color: #94A3B8; }
    tbody td { padding: 9px 0 9px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
    tbody td:first-child { padding-left: 0; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    tfoot td { padding: 10px 0 0 12px; font-weight: 700; color: #0A1B33; border-top: 2px solid #0A1B33; }
    tfoot td:first-child { padding-left: 0; }

    .note { font-size: 12px; font-style: italic; color: #64748B; margin: 6px 0 0; }

    /* Bunnlinje: betalingslinje + NOK-total RETT under Sum-raden (følger
       innholdet, ikke arket), adskilt med strek og litt luft */
    .payline {
      margin-top: 14px; padding-top: 12px; border-top: 1.5px solid #0A1B33;
      display: flex; justify-content: space-between; align-items: baseline; gap: 16px;
    }
    .payline-left { font-size: 13px; color: #0A1B33; }
    .payline-total { font-size: 19px; font-weight: 700; color: #0A1B33; white-space: nowrap; }
    .generated { margin-top: 10px; text-align: right; font-size: 10px; color: #CBD5E1; }

    @media print {
      body { padding: 0; }
      @page { margin: 1.8cm; size: A4; }
      /* Diskret signatur nederst på arket */
      .generated { position: fixed; bottom: 0; right: 0; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="top">
    <!-- Venstre: kunde (vinduskonvolutt-posisjon) + leveringsadresse + vår kontakt -->
    <div class="top-left">
      <div class="customer-name">${invoice.customerName}</div>
      ${invoice.customerAddress ? `<div class="customer-detail">${invoice.customerAddress}</div>` : ''}
      ${extras?.deliveryAddress ? `
      <div class="mid-block">
        <div class="block-label">Leveringsadresse</div>
        <div class="customer-detail">${extras.deliveryAddress}</div>
      </div>` : ''}
      ${extras?.ourContact ? `
      <div class="mid-block">
        <div class="block-label">Vår kontakt</div>
        <div class="customer-detail">${extras.ourContact}</div>
      </div>` : ''}
    </div>

    <!-- Høyre: logo, firmainfo, dokumentblokk -->
    <div class="top-right">
      ${company?.logoUrl ? `<img src="${company.logoUrl}" alt="Logo" style="height: 48px; max-width: 160px; object-fit: contain; object-position: right;" />` : ''}
      <div class="company-info">
        <div class="company-name">${company?.name ?? 'Efero'}</div>
        ${company?.address ? `<div>${company.address}</div>` : ''}
        ${company?.orgNumber ? `<div>Org.nr: NO ${company.orgNumber} MVA</div>` : ''}
        ${company?.email ? `<div>${company.email}</div>` : ''}
      </div>

      <div class="doc-title${isCreditNote ? ' credit' : ''}">${isCreditNote ? 'KREDITNOTA' : 'FAKTURA'}</div>
      ${!isCreditNote ? `<div><span class="status-badge">${statusLabel}</span></div>` : ''}

      <div class="kv">
        <div class="kv-row"><span class="kv-label">${isCreditNote ? 'Kreditnotanr.' : 'Fakturanr.'}</span><span class="kv-value strong">${invoice.invoiceNumber}</span></div>
        <div class="kv-row"><span class="kv-label">${isCreditNote ? 'Dato' : 'Fakturadato'}</span><span class="kv-value">${fmtDate(invoice.createdAt)}</span></div>
      </div>

      ${!isCreditNote ? `
      <div class="payinfo">
        <div class="payinfo-title">Betalingsinformasjon</div>
        <div class="kv">
          <div class="kv-row"><span class="kv-label">Forfallsdato</span><span class="kv-value">${fmtDate(invoice.dueDate)}</span></div>
          ${company?.accountNumber ? `<div class="kv-row"><span class="kv-label">Kontonummer</span><span class="kv-value strong">${company.accountNumber}</span></div>` : ''}
          ${showKid ? `<div class="kv-row"><span class="kv-label">KID</span><span class="kv-value strong">${invoice.kid}</span></div>` : ''}
        </div>
        ${showKid
          ? `<div class="kid-nb">NB! Oppgi alltid KID ved elektronisk betaling.</div>`
          : `<div class="mark-payment">Merk betalingen med fakturanummer ${invoice.invoiceNumber}</div>`}
      </div>` : `
      <div class="credit-ref">${refLine}</div>
      ${invoice.creditReason ? `<div class="credit-reason">Årsak: ${invoice.creditReason}</div>` : ''}`}
      ${!isCreditNote && refLine ? `<div class="credited-by">${refLine}</div>` : ''}
    </div>
  </div>

  <!-- Linjetabell -->
  <table>
    <thead>
      <tr>
        <th class="desc">Beskrivelse</th>
        <th>Enh.pris<span class="sub">(ekskl. mva)</span></th>
        <th>Beløp<span class="sub">(ekskl. mva)</span></th>
        <th>Mva<span class="sub">(25 %)</span></th>
        <th>Beløp<span class="sub">(inkl. mva)</span></th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
      ${invoice.note ? `<tr><td colspan="5" style="padding: 9px 0; border-bottom: 1px solid #F1F5F9; font-size: 12px; color: #64748B; font-style: italic;">${invoice.note}</td></tr>` : ''}
    </tbody>
    <tfoot>
      <tr>
        <td>Sum</td>
        <td></td>
        <td class="num">${fmtNum(invoice.subtotalExVat)}</td>
        <td class="num">${fmtNum(invoice.vat)}</td>
        <td class="num">${fmtNum(invoice.total)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Bunnlinje (kreditnota: ingen betalingslinje) -->
  <div class="payline">
    <span class="payline-left">${payLine}</span>
    <span class="payline-total">NOK ${fmtNum(invoice.total)}</span>
  </div>
  <div class="generated">Generert av Efero</div>
</body>
</html>`;
}
