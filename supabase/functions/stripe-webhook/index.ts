// Webhook-URL å registrere i Stripe Dashboard → Developers → Webhooks:
//   https://<project>.supabase.co/functions/v1/stripe-webhook
// Events å lytte på:
//   checkout.session.completed
//   customer.subscription.deleted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Mangler signatur', { status: 400 });

  const body = await req.text();

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (e: any) {
    return new Response(`Webhook-feil: ${e.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const companyId = session.metadata?.company_id;
    if (companyId) {
      await supabase.from('companies').update({
        subscription_status: 'active',
        stripe_subscription_id: session.subscription as string,
      }).eq('id', companyId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from('companies')
      .update({ subscription_status: 'canceled' })
      .eq('stripe_subscription_id', sub.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
