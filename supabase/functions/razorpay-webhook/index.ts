import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Constant-time string comparison.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Read RAW body (must not be re-serialized before HMAC).
  const rawBody = await req.text();
  const providedSig = req.headers.get('x-razorpay-signature') || '';
  const expectedSig = await hmacSha256Hex(webhookSecret, rawBody);

  if (!providedSig || !timingSafeEqual(providedSig, expectedSig)) {
    console.warn('Rejected webhook: signature mismatch');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = payload?.event as string | undefined;
  const paymentEntity = payload?.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id as string | undefined;
  const razorpayPaymentId = paymentEntity?.id as string | undefined;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    if (event === 'payment.captured' && razorpayOrderId) {
      const { data: order, error: findErr } = await admin
        .from('payment_orders')
        .select('id')
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle();
      if (findErr || !order) {
        console.warn('payment.captured for unknown order', razorpayOrderId, findErr);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store payment id (idempotent — activate_paid_plan short-circuits if already paid).
      if (razorpayPaymentId) {
        await admin
          .from('payment_orders')
          .update({ razorpay_payment_id: razorpayPaymentId })
          .eq('id', order.id);
      }

      const { error: rpcErr } = await admin.rpc('activate_paid_plan', {
        _payment_order_id: order.id,
      });
      if (rpcErr) console.error('activate_paid_plan failed', rpcErr);
    } else if (event === 'payment.failed' && razorpayOrderId) {
      await admin
        .from('payment_orders')
        .update({
          status: 'failed',
          razorpay_payment_id: razorpayPaymentId ?? null,
        })
        .eq('razorpay_order_id', razorpayOrderId)
        .neq('status', 'paid');
    }
  } catch (e) {
    console.error('webhook handler error', e);
    // Still ACK — Razorpay retries only on non-2xx; we've verified signature already.
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
