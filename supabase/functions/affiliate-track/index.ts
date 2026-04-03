import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_REGEX = /^[A-Za-z0-9_-]{3,50}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, affiliate_code, business_id } = body;

    // Input validation
    if (typeof action !== "string" || !["click", "signup"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!affiliate_code || !CODE_REGEX.test(affiliate_code)) {
      return new Response(JSON.stringify({ error: "Invalid affiliate_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "click") {
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("id, status")
        .eq("affiliate_code", affiliate_code)
        .eq("status", "approved")
        .maybeSingle();

      if (!affiliate) {
        return new Response(JSON.stringify({ error: "Invalid or unapproved affiliate" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("affiliate_events").insert({
        affiliate_id: affiliate.id,
        event_type: "click",
        amount: 0,
      });

      await admin.rpc("increment_affiliate_clicks", { _affiliate_id: affiliate.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "signup") {
      if (!business_id || !UUID_REGEX.test(business_id)) {
        return new Response(JSON.stringify({ error: "Invalid business_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: affiliate } = await admin
        .from("affiliates")
        .select("id")
        .eq("affiliate_code", affiliate_code)
        .maybeSingle();

      if (!affiliate) {
        return new Response(JSON.stringify({ success: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("affiliate_events").insert({
        affiliate_id: affiliate.id,
        event_type: "signup",
        referred_business_id: business_id,
        amount: 0,
      });

      // Only use RPC to increment — no buggy direct update
      await admin.rpc("increment_affiliate_signups", { _affiliate_id: affiliate.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
