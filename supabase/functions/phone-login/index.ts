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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = { ...corsHeaders, 'Content-Type': 'application/json' };

// Samme generiske svar uansett om nummeret finnes eller passordet er feil →
// lekker ikke om et telefonnummer er registrert.
const INVALID = { error: 'Feil telefonnummer eller passord' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return new Response(JSON.stringify(INVALID), { status: 401, headers: json });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Slå opp kandidat-e-poster (teknikere først) med service-role (bypasser RLS).
    const cleanedPhone = String(phone).replace(/\s/g, '');
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
