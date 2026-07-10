// Edge function: send-customer-invite
// Sender innloggingsdetaljer (e-post + midlertidig passord) til en NY kunde som
// Efero-eieren nettopp opprettet i superadmin. KUN superadmin kan kalle den.
// Deploy: supabase functions deploy send-customer-invite
// Secrets (finnes allerede): RESEND_API_KEY (+ SUPABASE_URL/SERVICE_ROLE_KEY auto)
//
// Input (JSON): { email, password, companyName, contactName }
//   Krever Authorization: Bearer <JWT>. Kalleren må være superadmin (e-posten
//   sammenlignes med app_config.superadmin_email server-side).
//
// Avsenderdomenet efero.no MÅ være verifisert i Resend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PORTAL_URL = 'https://portal.efero.no';

function inviteHtml(contactName: string, companyName: string, email: string, password: string): string {
  return `
<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
  body { font-family: 'Inter', Arial, sans-serif; color: #1F2937; background: #F5F7FA; padding: 0; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
  .header { padding: 32px; text-align: center; border-bottom: 1px solid #E2E8F0; }
  .logo { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: #0A1B33; margin: 0; }
  .logo span { color: #2563FF; }
  .content { padding: 36px 32px; }
  h1 { color: #0A1B33; font-size: 24px; font-weight: 700; margin: 0 0 20px; }
  p { font-size: 16px; line-height: 1.6; margin: 0 0 16px; color: #1F2937; }
  .creds { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 24px 0; }
  .creds .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin: 0 0 2px; }
  .creds .value { font-size: 17px; font-weight: 600; color: #0A1B33; margin: 0 0 14px; }
  .creds .value:last-child { margin-bottom: 0; }
  .btn { display: block; background: #2563FF; color: #FFFFFF; text-align: center; padding: 16px 24px; border-radius: 10px; font-size: 16px; font-weight: 600; text-decoration: none; margin: 28px 0; }
  .tip { background: #EEF4FF; border-radius: 10px; padding: 14px 18px; font-size: 14px; color: #0A1B33; margin: 20px 0; }
  .help { font-size: 14px; color: #64748B; line-height: 1.6; margin-top: 24px; }
  .help a { color: #2563FF; text-decoration: none; }
  .footer { background: #F8FAFC; padding: 24px 32px; text-align: center; font-size: 13px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><p class="logo"><span>E</span>fero</p></div>
    <div class="content">
      <h1>Velkommen til Efero${contactName ? ', ' + contactName : ''}!</h1>
      <p>Vi har opprettet en konto for <strong>${companyName}</strong>. Her er innloggingen din:</p>
      <div class="creds">
        <p class="label">E-post</p>
        <p class="value">${email}</p>
        <p class="label">Midlertidig passord</p>
        <p class="value">${password}</p>
      </div>
      <a href="${PORTAL_URL}" class="btn">Logg inn og kom i gang</a>
      <p>Første gang du logger inn, tar vi deg gjennom et kort oppsett — timepris, teknikere og logo — så du er klar til å sende faktura med én gang.</p>
      <div class="tip">💡 Bytt til ditt eget passord under <strong>Innstillinger</strong> etter første innlogging.</div>
      <p class="help">
        Trenger du hjelp? Svar på denne e-posten eller kontakt oss på
        <a href="mailto:kontakt@efero.no">kontakt@efero.no</a>.
      </p>
    </div>
    <div class="footer">Efero — jobbstyring for håndverkere</div>
  </div>
</body>
</html>`;
}

function inviteText(contactName: string, companyName: string, email: string, password: string): string {
  return `Velkommen til Efero${contactName ? ', ' + contactName : ''}!

Vi har opprettet en konto for ${companyName}. Her er innloggingen din:

E-post: ${email}
Midlertidig passord: ${password}

Logg inn og kom i gang: ${PORTAL_URL}

Første gang du logger inn, tar vi deg gjennom et kort oppsett (timepris, teknikere og logo) så du er klar til å sende faktura med én gang.

Tips: Bytt til ditt eget passord under Innstillinger etter første innlogging.

Trenger du hjelp? Kontakt oss på kontakt@efero.no.

— Efero`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Krev innlogget bruker.
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt!);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ikke autentisert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Kalleren MÅ være superadmin. app_config er en key/value-tabell (samme
    //    kilde som is_superadmin(): SELECT value WHERE key='superadmin_email').
    const { data: cfg } = await supabaseAdmin
      .from('app_config').select('value').eq('key', 'superadmin_email').maybeSingle();
    const superEmail = (cfg?.value ?? '').toLowerCase().trim();
    if (!superEmail || (user.email ?? '').toLowerCase().trim() !== superEmail) {
      return new Response(JSON.stringify({ error: 'Kun superadmin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Les payload (superadmin-styrt → trygt).
    const { email, password, companyName, contactName } = await req.json();
    if (!email || !password || !companyName) {
      return new Response(JSON.stringify({ error: 'Mangler felt' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'Efero <kontakt@efero.no>',
        to: [email],
        subject: 'Din Efero-innlogging',
        html: inviteHtml(contactName ?? '', companyName, email, password),
        text: inviteText(contactName ?? '', companyName, email, password),
      }),
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
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
