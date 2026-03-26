import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    if (action === "click") {
      // Record a click event and increment counter
      if (!affiliate_code) {
        return new Response(JSON.stringify({ error: "Missing affiliate_code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      // Insert click event
      await admin.from("affiliate_events").insert({
        affiliate_id: affiliate.id,
        event_type: "click",
        amount: 0,
      });

      // Increment click counter
      await admin.rpc("increment_affiliate_clicks", { _affiliate_id: affiliate.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "signup") {
      // Record a signup event and increment counter
      if (!affiliate_code || !business_id) {
        return new Response(JSON.stringify({ error: "Missing params" }), {
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

      // Increment signup counter
      await admin
        .from("affiliates")
        .update({ total_signups: affiliate.id })
        .eq("id", affiliate.id);
      
      // Use raw SQL increment via rpc
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
