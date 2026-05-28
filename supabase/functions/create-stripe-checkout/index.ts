// Nødvendige Supabase-hemmeligheter (sett via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY   — fra Stripe Dashboard → Developers → API keys
//   STRIPE_PRICE_ID     — Stripe Price ID for 399 kr/mnd abonnementet (price_xxx)
//   APP_URL             — din frontend-URL, f.eks. https://app.handverker.no

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt!);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ikke autentisert' }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', profile!.company_id)
      .single();

    if (!company) throw new Error('Firma ikke funnet');

    // Finn eller opprett Stripe-kunde
    let customerId: string = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: company.name,
        metadata: { company_id: company.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id);
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:19006';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: Deno.env.get('STRIPE_PRICE_ID')!,
        quantity: 1,
      }],
      success_url: `${appUrl}?payment=success`,
      cancel_url: `${appUrl}?payment=canceled`,
      metadata: { company_id: company.id },
      subscription_data: {
        metadata: { company_id: company.id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
