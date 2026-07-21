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

// U+2212 (typografisk minus fra Intl) → vanlig bindestrek, NBSP/NNBSP → mellomrom,
// så negative beløp (kreditnota) vises likt i e-post og PDF.
const fmt = (n: number) =>
  new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n))
    .replace(/\u2212/g, '-')
    .replace(/[\u00A0\u202F]/g, ' ') + ' kr';

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

// Ren tekst-versjon. Multipart (tekst + HTML) gir lavere spam-score hos Outlook/Gmail.
// Kort og ren (2026-07-22): all spesifikasjon og betalingsinfo (KID/kontonummer)
// bor i PDF-vedlegget — e-posten er kun et følgebrev.
function invoiceText(invoice: any, company: any): string {
  return [
    `Hei ${invoice.customer_name},`,
    '',
    `Du har mottatt en faktura fra ${company.name}. Fakturaen ligger vedlagt som PDF.`,
    '',
    `Beløp: ${fmt(invoice.total)} — forfall ${fmtDate(invoice.due_date)}.`,
    '',
    'Har du spørsmål? Svar på denne e-posten.',
    '',
    'Med vennlig hilsen',
    company.name,
  ].join('\n');
}

// ── Kreditnota (credits_invoice_id satt) ─────────────────────────────────────
// Eget følgebrev: forklarer at den krediterer originalfakturaen med årsak.
// INGEN betalingsinformasjon/forfall — en kreditnota er ikke et betalingskrav.
// Kort og ren (2026-07-22): spesifikasjonen bor i PDF-vedlegget.
function creditNoteText(invoice: any, company: any, originalNumber: string | null): string {
  const credits = originalNumber ? `faktura ${originalNumber}` : 'originalfakturaen';
  return [
    `Hei ${invoice.customer_name},`,
    '',
    `${company.name} har opprettet kreditnota ${invoice.invoice_number} som krediterer ${credits}. Fakturaen er dermed nullet ut og skal ikke betales. Kreditnotaen ligger vedlagt som PDF.`,
    invoice.credit_reason ? `Årsak: ${invoice.credit_reason}` : '',
    '',
    `Beløp: ${fmt(invoice.total)}.`,
    '',
    'Har du spørsmål? Svar på denne e-posten.',
    '',
    'Med vennlig hilsen',
    company.name,
  ].join('\n');
}

function creditNoteHtml(invoice: any, company: any, originalNumber: string | null): string {
  const credits = originalNumber ? `faktura <strong>${originalNumber}</strong>` : 'originalfakturaen';

  return `
<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
  body { font-family: 'Inter', Arial, sans-serif; color: #1F2937; background: #F5F7FA; padding: 0; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
  .header { background: #0A1B33; padding: 28px 32px; }
  .header h1 { color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0; }
  .doc-type { color: #A78BFA; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; margin: 0 0 6px; }
  .content { padding: 32px; }
  .greeting { font-size: 16px; margin: 0 0 8px; }
  p { font-size: 16px; line-height: 1.6; margin: 0 0 16px; color: #1F2937; }
  .reason-box { background: #F5F3FF; border-radius: 12px; padding: 14px 18px; margin: 0 0 16px; font-size: 15px; color: #5B21B6; }
  .amount-line { font-size: 16px; font-weight: 600; color: #0A1B33; margin: 0 0 16px; }
  .footer { background: #F8FAFC; padding: 24px 32px; text-align: center; font-size: 13px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><p class="doc-type">KREDITNOTA</p><h1>${company.name}</h1></div>
    <div class="content">
      <p class="greeting">Hei ${invoice.customer_name},</p>
      <p>${company.name} har opprettet kreditnota <strong>${invoice.invoice_number}</strong> som
      krediterer ${credits}. Fakturaen er dermed nullet ut og skal ikke betales.
      Kreditnotaen ligger vedlagt som PDF.</p>
      ${invoice.credit_reason ? `<div class="reason-box"><strong>Årsak:</strong> ${invoice.credit_reason}</div>` : ''}
      <p class="amount-line">Beløp: ${fmt(invoice.total)}</p>
      <p style="font-size:13px;color:#94A3B8;margin-top:24px;">Har du spørsmål? Svar på denne e-posten.</p>
    </div>
    <div class="footer">Generert av Efero for ${company.name}</div>
  </div>
</body>
</html>`;
}

// Kort og rent følgebrev (2026-07-22): all spesifikasjon og betalingsinfo
// (KID/kontonummer) bor i PDF-vedlegget.
function invoiceHtml(invoice: any, company: any): string {
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
  .amount-line { font-size: 16px; font-weight: 600; color: #0A1B33; margin: 0 0 16px; }
  .footer { background: #F8FAFC; padding: 24px 32px; text-align: center; font-size: 13px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>${company.name}</h1></div>
    <div class="content">
      <p class="greeting">Hei ${invoice.customer_name},</p>
      <p>Du har mottatt en faktura fra ${company.name}. Fakturaen ligger vedlagt som PDF.</p>
      <p class="amount-line">Beløp: ${fmt(invoice.total)} — forfall ${fmtDate(invoice.due_date)}</p>
      <p style="font-size:13px;color:#94A3B8;margin-top:24px;">Har du spørsmål? Svar på denne e-posten.</p>
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

    // ── Autorisasjon ──────────────────────────────────────────────────────────
    // Funksjonen bruker service-role-nøkkelen og handler på en klient-oppgitt
    // invoiceId. Uten denne sjekken kunne hvem som helst med anon-nøkkelen sende
    // en hvilken som helst bedrifts faktura. Krev derfor gyldig JWT, og at
    // kalleren tilhører SAMME firma som fakturaen.
    //
    // Merk: HVILKEN SOM HELST rolle i firmaet (ikke kun admin). Teknikere utløser
    // denne e-posten automatisk: når en tekniker markerer en jobb som ferdig,
    // kaller generateInvoice() → sendInvoiceEmail(). Admin-only ga 403 og kundens
    // faktura-e-post ble stille hoppet over. (send-quote-email er fortsatt
    // admin-only — kun admins lager tilbud.)
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt!);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ikke autentisert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: invoice } = await supabase
      .from('invoices').select('*').eq('id', invoiceId).single();
    if (!invoice) throw new Error('Faktura ikke funnet');

    const { data: profile } = await supabase
      .from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile || profile.company_id !== invoice.company_id) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert for denne fakturaen' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!invoice.customer_email) throw new Error('Kunden har ingen e-postadresse');

    const { data: company } = await supabase
      .from('companies').select('*').eq('id', invoice.company_id).single();
    if (!company) throw new Error('Firma ikke funnet');

    // TODO (sikkerhet/integritet): generer fakturaens PDF server-side fra raden
    // (invoice + company) i stedet for å stole på klient-oppgitt pdfBase64, slik at
    // vedlegget garantert matcher den lagrede fakturaen. Inntil da: vedlegget brukes
    // kun hvis det er oppgitt, og autz-sjekken over hindrer uvedkommende utsendelse.

    const replyTo = company.email || 'kontakt@efero.no';

    // Kreditnota: eget emne/innhold uten betalingsinformasjon. Originalens
    // fakturanummer hentes for «krediterer faktura X»-teksten.
    const isCreditNote = !!invoice.credits_invoice_id;
    let originalNumber: string | null = null;
    if (isCreditNote) {
      const { data: orig } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('id', invoice.credits_invoice_id)
        .maybeSingle();
      originalNumber = orig?.invoice_number ?? null;
    }

    const body: Record<string, unknown> = {
      from: `${company.name} <faktura@efero.no>`,
      reply_to: replyTo,
      to: [invoice.customer_email],
      subject: isCreditNote
        ? `Kreditnota ${invoice.invoice_number}`
        : `Faktura ${invoice.invoice_number} fra ${company.name}`,
      html: isCreditNote
        ? creditNoteHtml(invoice, company, originalNumber)
        : invoiceHtml(invoice, company),
      text: isCreditNote
        ? creditNoteText(invoice, company, originalNumber)
        : invoiceText(invoice, company),
    };

    if (pdfBase64) {
      body.attachments = [{
        filename: `${isCreditNote ? 'kreditnota' : 'faktura'}-${invoice.invoice_number}.pdf`,
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
