// Edge function: phone-login
// Tekniker-innlogging med telefonnummer UTEN å eksponere telefon→e-post som et
// anonymt oppslags-orakel (audit #5).
//
// Tidligere kalte klienten get_email_by_phone/get_emails_by_phone (GRANT til anon)
// for å oversette telefon → e-post FØR innlogging. Det lot hvem som helst med
// anon-nøkkelen slå opp e-posten til et hvilket som helst telefonnummer (PII /
// enumerering). Nå skjer oppslaget + passordverifisering server-side her, og
// funksjonen returnerer KUN en session ved suksess — aldri e-postlisten.
//
// Deploy (pre-auth endepunkt — må deployes uten JWT-verifisering):
//   supabase functions deploy phone-login --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (auto-injisert)
//
// Rate-limiting (audit): maks 5 forsøk per telefonnummer ELLER per IP per 15 min.
// Forsøk logges i tabellen phone_login_attempts (se migration_v35.sql), som kun
// service-role (denne funksjonen) når. Ved vellykket innlogging nullstilles
// nummerets teller. Sjekken feiler ÅPENT (logger + slipper gjennom) hvis DB-en er
// utilgjengelig eller migrasjonen ikke er kjørt ennå — en hikke skal ikke stenge
// all innlogging.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = { ...corsHeaders, 'Content-Type': 'application/json' };

// Samme generiske svar uansett om nummeret finnes eller passordet er feil →
// lekker ikke om et telefonnummer er registrert.
const INVALID = { error: 'Feil telefonnummer eller passord' };
const TOO_MANY = { error: 'For mange innloggingsforsøk. Vent 15 minutter og prøv igjen.' };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Klientens IP fra proxy-headere (Supabase setter x-forwarded-for).
function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return new Response(JSON.stringify(INVALID), { status: 401, headers: json });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const cleanedPhone = String(phone).replace(/\s/g, '');
    const ip = clientIp(req);

    // ── Rate-limiting: blokker ved > 5 forsøk per nummer/IP siste 15 min ────────
    // Fail-open: eventuell DB-feil logges, men stopper ikke innloggingen.
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
    try {
      const [byPhone, byIp] = await Promise.all([
        admin
          .from('phone_login_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('phone', cleanedPhone)
          .gte('created_at', windowStart),
        admin
          .from('phone_login_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('ip', ip)
          .gte('created_at', windowStart),
      ]);

      if ((byPhone.count ?? 0) >= MAX_ATTEMPTS || (byIp.count ?? 0) >= MAX_ATTEMPTS) {
        return new Response(JSON.stringify(TOO_MANY), { status: 429, headers: json });
      }

      // Logg dette forsøket, og rydd bort utløpte rader (billig, holder tabellen liten).
      await admin.from('phone_login_attempts').insert({ phone: cleanedPhone, ip });
      await admin.from('phone_login_attempts').delete().lt('created_at', windowStart);
    } catch (e) {
      console.error('rate-limit-sjekk feilet (fail-open):', e);
    }

    // Slå opp kandidat-e-poster (teknikere først) med service-role (bypasser RLS).
    const { data: profiles } = await admin
      .from('profiles')
      .select('email, role')
      .eq('phone', cleanedPhone)
      .not('email', 'is', null);

    const candidates = (profiles ?? [])
      .sort((a: any, b: any) =>
        Number(b.role === 'technician') - Number(a.role === 'technician'),
      )
      .map((p: any) => p.email as string)
      .filter(Boolean);

    // Prøv hver kandidat med passordet via en ren anon-klient. Passordet avgjør
    // riktig konto; e-posten forlater aldri serveren.
    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
    for (const email of candidates) {
      const { data, error } = await anon.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (!error && data.session) {
        // Vellykket innlogging → nullstill nummerets teller (så en legitim bruker
        // ikke sitter igjen nær grensen). IP-radene beholdes.
        try {
          await admin.from('phone_login_attempts').delete().eq('phone', cleanedPhone);
        } catch (e) {
          console.error('kunne ikke nullstille rate-limit-teller:', e);
        }
        return new Response(
          JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
          { headers: json },
        );
      }
    }

    return new Response(JSON.stringify(INVALID), { status: 401, headers: json });
  } catch {
    return new Response(JSON.stringify(INVALID), { status: 401, headers: json });
  }
});
