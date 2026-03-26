import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAIL = "suvee.fashion@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user || user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action } = body;

    let result: unknown = null;

    switch (action) {
      case "approve_affiliate": {
        const { affiliate_id } = body;
        const { error } = await admin
          .from("affiliates")
          .update({ status: "approved" })
          .eq("id", affiliate_id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "suspend_affiliate": {
        const { affiliate_id } = body;
        const { error } = await admin
          .from("affiliates")
          .update({ status: "suspended" })
          .eq("id", affiliate_id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "update_commission": {
        const { affiliate_id, commission_rate } = body;
        const { error } = await admin
          .from("affiliates")
          .update({ commission_rate })
          .eq("id", affiliate_id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "extend_trial": {
        const { subscription_id, extra_days } = body;
        const { data: sub } = await admin
          .from("subscriptions")
          .select("extra_days")
          .eq("id", subscription_id)
          .single();
        const newDays = (sub?.extra_days || 0) + extra_days;
        const { error } = await admin
          .from("subscriptions")
          .update({ extra_days: newDays })
          .eq("id", subscription_id);
        if (error) throw error;
        result = { success: true, new_extra_days: newDays };
        break;
      }
      case "reply_ticket": {
        const { ticket_id, content } = body;
        const { error } = await admin.from("ticket_messages").insert({
          ticket_id,
          sender_type: "admin",
          sender_name: "Disha Support",
          content,
        });
        if (error) throw error;
        await admin
          .from("support_tickets")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", ticket_id);
        result = { success: true };
        break;
      }
      case "resolve_ticket": {
        const { ticket_id } = body;
        const { error } = await admin
          .from("support_tickets")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket_id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
