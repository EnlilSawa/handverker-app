// Edge function: send-payment-reminder
// Manuell betalingspåminnelse («Send purring»). Håndverkeren (admin) trykker en
// knapp i appen for å sende en vennlig påminnelse til kunden om en forfalt faktura.
// Samme beløp, INGEN purregebyr, ingen ny forfallsdato.
//
// Deploy: supabase functions deploy send-payment-reminder
// Secrets: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (+ APP_URL valgfri)
//
// Input (JSON): { invoiceId }  ·  Krever Authorization: Bearer <JWT>
// Autz: kalleren må tilhøre fakturaens firma (samme mønster som send-invoice-email).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = { ...corsHeaders, 'Content-Type': 'application/json' };

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtAmount(amount: number): string {
  return new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(amount) + ' kr';
}

// Samme stil/wrapper som send-invoice-reminders (overdue-utseende).
const baseStyle = `
  body{font-family:Arial,sans-serif;color:#1F2937;background:#F5F7FA;padding:0;margin:0}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .body{padding:32px}
  .p{font-size:15px;line-height:1.6;margin:0 0 16px}
  .box{border-radius:12px;padding:20px;text-align:center;margin:24px 0}
  .box-lbl{font-size:12px;margin-bottom:4px}
  .box-val{font-size:30px;font-weight:700}
  .btn{display:block;color:#fff;text-align:center;padding:15px 24px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;margin:24px 0}
  .ftr{background:#F8FAFC;padding:16px 32px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0}
`;

function paymentReminderEmail(inv: any, company: any, appUrl: string): string {
  const body = `
    <p class="p">Hei ${inv.customer_name},</p>
    <p class="p">Dette er en vennlig påminnelse om at faktura <strong>${inv.invoice_number}</strong>
    fra <strong>${company.name}</strong> på <strong>${fmtAmount(Number(inv.total))}</strong>
    fortsatt står som ubetalt. Forfallsdato var <strong>${fmtDate(inv.due_date)}</strong>.</p>
    <p class="p">Vi setter pris på om du betaler så snart som mulig.</p>
    <div class="box" style="background:#FEF2F2">
      <div class="box-lbl" style="color:#991B1B">Ubetalt beløp inkl. MVA</div>
      <div class="box-val" style="color:#DC2626">${fmtAmount(Number(inv.total))}</div>
    </div>
    ${company.account_number ? `<p class="p" style="font-size:13px;color:#64748B">Kontonummer: <strong>${company.account_number}</strong></p>` : ''}
    <a href="${appUrl}/faktura/${inv.id}" class="btn" style="background:#DC2626">Se faktura →</a>`;
  return `<!DOCTYPE html><html lang="no"><head><meta charset="utf-8"/>
<style>${baseStyle}</style></head><body>
<div class="wrap">
  <div style="background:#C2410C;padding:28px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">${company.name}</h1>
  </div>
  <div class="body">${body}</div>
  <div class="ftr">Generert av Efero &middot; ${inv.invoice_number}</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'Mangler invoiceId' }), { status: 400, headers: json });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const appUrl = Deno.env.get('APP_URL') ?? 'https://efero.app';

    // Autentisering
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt!);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ikke autentisert' }), { status: 401, headers: json });
    }

    const { data: invoice } = await supabase
      .from('invoices').select('*').eq('id', invoiceId).single();
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Faktura ikke funnet' }), { status: 404, headers: json });
    }

    // En kreditert faktura er motpostert (ikke utestående), og en kreditnota er ikke
    // et betalingskrav → purring gir ingen mening og skal aldri sendes til kunden.
    if (invoice.status === 'credited' || invoice.credits_invoice_id) {
      return new Response(
        JSON.stringify({ error: 'Kan ikke sende purring på en kreditert faktura eller kreditnota' }),
        { status: 400, headers: json },
      );
    }

    // Autorisasjon: samme firma (alle roller — som relaxet send-invoice-email)
    const { data: profile } = await supabase
      .from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile || profile.company_id !== invoice.company_id) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert for denne fakturaen' }), { status: 403, headers: json });
    }

    if (!invoice.customer_email) {
      return new Response(JSON.stringify({ error: 'Kunden har ingen e-postadresse' }), { status: 400, headers: json });
    }

    const { data: company } = await supabase
      .from('companies').select('*').eq('id', invoice.company_id).single();
    if (!company) {
      return new Response(JSON.stringify({ error: 'Firma ikke funnet' }), { status: 404, headers: json });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: `${company.name} via Efero <faktura@efero.no>`,
        reply_to: company.email || 'kontakt@efero.no',
        to: [invoice.customer_email],
        subject: `Betalingspåminnelse: Faktura ${invoice.invoice_number} fra ${company.name}`,
        html: paymentReminderEmail(invoice, company, appUrl),
      }),
    });
    if (!emailRes.ok) {
      throw new Error(`Resend feilet: ${await emailRes.text()}`);
    }

    // Tell opp manuell purring + sett tidspunkt
    const nextCount = (invoice.reminder_count ?? 0) + 1;
    const sentAt = new Date().toISOString();
    await supabase.from('invoices')
      .update({ reminder_count: nextCount, last_reminder_sent_at: sentAt })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({ ok: true, reminderCount: nextCount, lastReminderSentAt: sentAt }),
      { headers: json },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: json });
  }
});
