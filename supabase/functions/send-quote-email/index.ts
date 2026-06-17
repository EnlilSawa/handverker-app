// Edge function: send-quote-email
// Deploy: supabase functions deploy send-quote-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxxxxx
//          supabase secrets set SUPABASE_URL=https://xxx.supabase.co
//          supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJxxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { quoteId } = await req.json();
    if (!quoteId) throw new Error('Mangler quoteId');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Autorisasjon ──────────────────────────────────────────────────────────
    // Krev gyldig JWT, og at kalleren er ADMIN i SAMME firma som tilbudet.
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt!);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ikke autentisert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch quote (sjekk eksistens FØR vi bruker quote.company_id)
    const { data: quote } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
    if (!quote) throw new Error('Tilbud ikke funnet');

    const { data: profile } = await supabase
      .from('profiles').select('role, company_id').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin' || profile.company_id !== quote.company_id) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert for dette tilbudet' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: company } = await supabase.from('companies').select('*').eq('id', quote.company_id).single();
    if (!company) throw new Error('Firma ikke funnet');

    const approvalUrl = `${Deno.env.get('APP_URL') ?? 'https://efero.app'}/tilbud/${quoteId}`;
    const validDate = new Date(quote.valid_until).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

    const total = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(Number(quote.total_amount)) + ' kr';

    const html = `
<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"/><style>
  body { font-family: Arial, sans-serif; color: #1F2937; background: #F5F7FA; padding: 0; margin: 0; }
  .container { max-width: 580px; margin: 40px auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; }
  .header { background: #0A1B33; padding: 32px; text-align: center; }
  .header h1 { color: #FFFFFF; font-size: 24px; margin: 0; }
  .content { padding: 32px; }
  .greeting { font-size: 16px; margin-bottom: 16px; }
  .total-box { background: #EEF4FF; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
  .total-label { font-size: 13px; color: #64748B; margin-bottom: 4px; }
  .total-value { font-size: 32px; font-weight: 700; color: #2563FF; }
  .btn { display: block; background: #2563FF; color: #FFFFFF; text-align: center; padding: 16px 24px; border-radius: 10px; font-size: 16px; font-weight: 600; text-decoration: none; margin: 24px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
  .footer { background: #F8FAFC; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>${company.name}</h1>
    </div>
    <div class="content">
      <p class="greeting">Hei ${quote.customer_name},</p>
      <p>${company.name} har sendt deg et tilbud på <strong>${quote.title}</strong>.</p>

      <div class="total-box">
        <div class="total-label">Totalt inkl. MVA</div>
        <div class="total-value">${total}</div>
      </div>

      <div class="info-row"><span>Tilbudsnummer</span><strong>${quote.quote_number}</strong></div>
      <div class="info-row"><span>Dato</span><span>${new Date(quote.created_at).toLocaleDateString('nb-NO')}</span></div>
      <div class="info-row"><span>Gyldig til</span><strong>${validDate}</strong></div>

      ${quote.description ? `<p style="margin-top:20px;color:#64748B;font-size:14px;">${quote.description}</p>` : ''}

      <a href="${approvalUrl}" class="btn">Se og godkjenn tilbud →</a>

      <p style="font-size:13px;color:#94A3B8;text-align:center;">
        Du kan godkjenne eller avslå tilbudet ved å klikke på knappen ovenfor.
      </p>
    </div>
    <div class="footer">Generert av Efero · Tilbudsnummer ${quote.quote_number}</div>
  </div>
</body>
</html>`;

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: `${company.name} via Efero <tilbud@efero.app>`,
        to: [quote.customer_email],
        subject: `Tilbud fra ${company.name} — ${quote.title}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend feilet: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
