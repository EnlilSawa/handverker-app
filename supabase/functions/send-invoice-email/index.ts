// Edge function: send-invoice-email
// Sendes når en jobb markeres ferdig og faktura genereres, eller manuelt fra fakturasiden.
// Deploy: supabase functions deploy send-invoice-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxxxxx
//          supabase secrets set SUPABASE_URL=https://xxx.supabase.co
//          supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJxxx
//
// Input (JSON): { invoiceId: string, pdfBase64: string }
//   pdfBase64 = fakturaen som PDF (base64 uten data:-prefiks), generert klient-side.
//
// Fra:      "<bedriftsnavn> <faktura@efero.no>"
// Reply-To: bedriftens egen e-post (companies.email) — svar går til håndverkeren.
// Avsenderdomenet efero.no MÅ være verifisert i Resend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(Number(n)) + ' kr';

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

interface LineItem { description: string; amount: number }

function invoiceHtml(invoice: any, company: any): string {
  const lineRows = (invoice.line_items as LineItem[])
    .map(
      (item) => `
      <div class="info-row"><span>${item.description}</span><span>${fmt(item.amount)}</span></div>`,
    )
    .join('');

  const paymentInfo = company.account_number
    ? `<div class="info-row"><span>Kontonummer</span><strong>${company.account_number}</strong></div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
  body { font-family: 'Inter', Arial, sans-serif; color: #1F2937; background: #F5F7FA; padding: 0; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
  .header { background: #0A1B33; padding: 28px 32px; }
  .header h1 { color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0; }
  .content { padding: 32px; }
  .greeting { font-size: 16px; margin: 0 0 8px; }
  p { font-size: 16px; line-height: 1.6; margin: 0 0 16px; color: #1F2937; }
  .section-label { font-size: 12px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; margin: 28px 0 8px; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 15px; }
  .sub-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; color: #64748B; }
  .total-box { background: #EEF4FF; border-radius: 12px; padding: 18px 20px; margin: 16px 0 0; display: flex; justify-content: space-between; align-items: center; }
  .total-box .label { font-size: 15px; font-weight: 600; color: #0A1B33; }
  .total-box .value { font-size: 26px; font-weight: 700; color: #2563FF; }
  .due { margin-top: 24px; font-size: 15px; color: #1F2937; }
  .footer { background: #F8FAFC; padding: 24px 32px; text-align: center; font-size: 13px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>${company.name}</h1></div>
    <div class="content">
      <p class="greeting">Hei ${invoice.customer_name},</p>
      <p>Her er faktura <strong>${invoice.invoice_number}</strong> fra ${company.name}.</p>

      <div class="section-label">SPESIFIKASJON</div>
      ${lineRows}

      <div class="sub-row"><span>Sum eks. MVA</span><span>${fmt(invoice.subtotal_ex_vat)}</span></div>
      <div class="sub-row"><span>MVA 25%</span><span>${fmt(invoice.vat)}</span></div>

      <div class="total-box">
        <span class="label">Totalt inkl. MVA</span>
        <span class="value">${fmt(invoice.total)}</span>
      </div>

      <p class="due"><strong>Forfallsdato:</strong> ${fmtDate(invoice.due_date)}</p>

      <div class="section-label">BETALINGSINFORMASJON</div>
      ${paymentInfo}
      <div class="info-row"><span>Forfall</span><strong>${fmtDate(invoice.due_date)}</strong></div>
      <div class="info-row"><span>Beløp å betale</span><strong>${fmt(invoice.total)}</strong></div>

      <p style="font-size:13px;color:#94A3B8;margin-top:24px;">
        Fakturaen er også vedlagt som PDF. Har du spørsmål? Svar på denne e-posten.
      </p>
    </div>
    <div class="footer">Generert av Efero for ${company.name}</div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { invoiceId, pdfBase64 } = await req.json();
    if (!invoiceId) throw new Error('Mangler invoiceId');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: invoice } = await supabase
      .from('invoices').select('*').eq('id', invoiceId).single();
    if (!invoice) throw new Error('Faktura ikke funnet');
    if (!invoice.customer_email) throw new Error('Kunden har ingen e-postadresse');

    const { data: company } = await supabase
      .from('companies').select('*').eq('id', invoice.company_id).single();
    if (!company) throw new Error('Firma ikke funnet');

    const replyTo = company.email || 'kontakt@efero.no';

    const body: Record<string, unknown> = {
      from: `${company.name} <faktura@efero.no>`,
      reply_to: replyTo,
      to: [invoice.customer_email],
      subject: `Faktura ${invoice.invoice_number} fra ${company.name}`,
      html: invoiceHtml(invoice, company),
    };

    if (pdfBase64) {
      body.attachments = [{
        filename: `faktura-${invoice.invoice_number}.pdf`,
        content: pdfBase64,
      }];
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend feilet: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
