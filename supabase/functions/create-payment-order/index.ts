import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Mirror of src/lib/pricing.ts — server-side source of truth for amounts.
const GST_RATE = 0.18;
const PRICING = {
  growth: { monthlyPrice: 999, annualPrice: 799 },
  scale: { monthlyPrice: 2499, annualPrice: 1999 },
} as const;

type Tier = keyof typeof PRICING;
type Cycle = 'monthly' | 'annual';

function computeAmountPaise(tier: Tier, cycle: Cycle): number {
  const t = PRICING[tier];
  // annualPrice is per-month equivalent; charge 12 months for annual.
  const rupees = cycle === 'annual' ? t.annualPrice * 12 : t.monthlyPrice;
  const withGst = rupees * (1 + GST_RATE);
  return Math.round(withGst * 100);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    // Parse & validate body.
    const body = await req.json().catch(() => ({}));
    const tier = body?.tier as Tier;
    const billing_cycle = body?.billing_cycle as Cycle;
    if (tier !== 'growth' && tier !== 'scale') {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (billing_cycle !== 'monthly' && billing_cycle !== 'annual') {
      return new Response(JSON.stringify({ error: 'Invalid billing_cycle' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve business from JWT — never from client body.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('business_id')
      .eq('id', userId)
      .maybeSingle();
    if (profileErr || !profile?.business_id) {
      return new Response(JSON.stringify({ error: 'No business context' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const businessId = profile.business_id as string;

    const amount_paise = computeAmountPaise(tier, billing_cycle);

    // Create Razorpay order.
    const basicAuth = btoa(`${keyId}:${keySecret}`);
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount_paise,
        currency: 'INR',
        notes: { business_id: businessId, tier, billing_cycle },
      }),
    });

    const rzpJson = await rzpRes.json();
    if (!rzpRes.ok || !rzpJson?.id) {
      console.error('Razorpay order creation failed', rzpJson);
      return new Response(JSON.stringify({ error: 'Payment gateway error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: insertErr } = await admin.from('payment_orders').insert({
      business_id: businessId,
      tier,
      billing_cycle,
      amount_paise,
      razorpay_order_id: rzpJson.id,
      status: 'created',
    });
    if (insertErr) {
      console.error('payment_orders insert failed', insertErr);
      return new Response(JSON.stringify({ error: 'Could not record order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: rzpJson.id,
        amount_paise,
        key_id: keyId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('create-payment-order error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
