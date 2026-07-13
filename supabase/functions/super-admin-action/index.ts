import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAILS = ["suvee.fashion@gmail.com", "shrirajglobal@gmail.com"];

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

    if (authError || !user || !SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
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
      case "set_business_plan": {
        const { business_id, new_plan } = body;
        const ALLOWED_PLANS = ["starter", "growth", "scale"];
        if (!business_id || !ALLOWED_PLANS.includes(new_plan)) {
          return new Response(JSON.stringify({ error: "Invalid business_id or new_plan" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: existing, error: fetchErr } = await admin
          .from("subscriptions")
          .select("id, plan")
          .eq("business_id", business_id)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!existing) {
          return new Response(JSON.stringify({ error: "Subscription not found for business" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const old_plan = existing.plan;
        const { error: updErr } = await admin
          .from("subscriptions")
          .update({
            plan: new_plan,
            status: "active",
            activation_source: "manual_admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updErr) throw updErr;

        // Reuse existing audit table: activity_logs
        await admin.from("activity_logs").insert({
          business_id,
          user_id: user.id,
          user_name: user.email ?? "super_admin",
          action: "plan_override",
          entity_type: "subscription",
          entity_id: existing.id,
          entity_label: `${old_plan} → ${new_plan}`,
          metadata: {
            old_plan,
            new_plan,
            admin_email: user.email,
            timestamp: new Date().toISOString(),
          },
        });

        result = { success: true, old_plan, new_plan };
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
