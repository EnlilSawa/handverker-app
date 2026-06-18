// Edge function: sign-job-images
// Returnerer korttidssignerte URL-er for en jobbs bilder (audit #6).
//
// job-images-bucketen er PRIVAT (migration_v23): de offentlige URL-ene fungerer
// ikke lenger, og kundebilder er ikke world-readable. Denne funksjonen verifiserer
// at kalleren tilhører jobbens firma og lager signerte URL-er med service role
// (bypasser storage-RLS). Signering skjer kun etter autorisasjon.
//
// Deploy: supabase functions deploy sign-job-images
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injisert)
//
// Input (JSON): { jobId: string }  ·  Krever Authorization: Bearer <JWT>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = { ...corsHeaders, 'Content-Type': 'application/json' };

const SIGN_TTL = 3600; // 1 time

// Hent storage-pathen fra en lagret URL (gammelt format: full public-URL) eller
// bruk verdien direkte hvis den allerede er en path.
function extractPath(value: string): string {
  const marker = '/job-images/';
  const i = value.indexOf(marker);
  return i >= 0 ? value.slice(i + marker.length) : value;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Mangler jobId' }), { status: 400, headers: json });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Autentisering
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(jwt!);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ikke autentisert' }), { status: 401, headers: json });
    }

    // Autorisasjon basert på JOBBENS eierskap (kilden til sannhet), ikke på
    // job_images.company_id — den kolonnen kan være utdatert/feil fra historiske
    // kryss-firma-data. Kalleren må tilhøre samme firma som jobben.
    const { data: profile } = await admin
      .from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'Ingen firmatilgang' }), { status: 403, headers: json });
    }

    const { data: job } = await admin
      .from('jobs').select('company_id').eq('id', jobId).single();
    // Ikke lekk eksistens: returner tom liste hvis jobben ikke finnes eller ikke
    // tilhører kallerens firma.
    if (!job || job.company_id !== profile.company_id) {
      return new Response(JSON.stringify({ images: [] }), { headers: json });
    }

    const { data: rows } = await admin
      .from('job_images')
      .select('*')
      .eq('job_id', jobId)
      .order('uploaded_at', { ascending: true });

    const list = rows ?? [];
    const images = (
      await Promise.all(
        list.map(async (r: any) => {
          const path = extractPath(r.image_url);
          const { data: s, error } = await admin.storage
            .from('job-images')
            .createSignedUrl(path, SIGN_TTL);
          if (error || !s?.signedUrl) return null;
          return { ...r, image_url: s.signedUrl };
        }),
      )
    ).filter(Boolean);

    return new Response(JSON.stringify({ images }), { headers: json });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: json });
  }
});
