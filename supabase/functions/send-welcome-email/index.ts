// Edge function: send-welcome-email
// Sendes når en ny bedrift har fullført onboarding (setup_company).
// Deploy: supabase functions deploy send-welcome-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxxxxx
//
// Input (JSON): { to: string, name: string, companyName: string }
//   to          = den nye brukerens e-postadresse
//   name        = brukerens navn
//   companyName = bedriftsnavn
//
// Avsenderdomenet efero.no MÅ være verifisert i Resend.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOGIN_URL = 'https://efero.no/login';

function welcomeHtml(name: string, companyName: string): string {
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
  .trial { background: #EEF4FF; border-radius: 12px; padding: 18px 20px; margin: 24px 0; font-size: 16px; color: #0A1B33; font-weight: 600; text-align: center; }
  .btn { display: block; background: #2563FF; color: #FFFFFF; text-align: center; padding: 16px 24px; border-radius: 10px; font-size: 16px; font-weight: 600; text-decoration: none; margin: 28px 0; }
  .help { font-size: 14px; color: #64748B; line-height: 1.6; margin-top: 24px; }
  .help a { color: #2563FF; text-decoration: none; }
  .footer { background: #F8FAFC; padding: 24px 32px; text-align: center; font-size: 13px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p class="logo"><span>E</span>fero</p>
    </div>
    <div class="content">
      <h1>Velkommen, ${name}!</h1>
      <p>Takk for at du registrerte <strong>${companyName}</strong> hos Efero.</p>
      <div class="trial">Du har nå 30 dagers gratis prøveperiode.</div>
      <p>Logg inn og kom i gang:</p>
      <a href="${LOGIN_URL}" class="btn">Gå til Efero</a>
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { to, name, companyName } = await req.json();
    if (!to || !companyName) throw new Error('Mangler to eller companyName');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'Efero <kontakt@efero.no>',
        to: [to],
        subject: 'Velkommen til Efero!',
        html: welcomeHtml(name ?? '', companyName),
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
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
