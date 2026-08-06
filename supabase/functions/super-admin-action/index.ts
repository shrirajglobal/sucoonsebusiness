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
      case "set_business_plan":
      case "approve_upgrade_request": {
        // Shared handler: grant a plan with optional expiry + reason.
        // For approve flow, resolve business_id from the upgrade request row.
        let business_id = body.business_id as string | undefined;
        let request_id: string | undefined = body.request_id;

        if (action === "approve_upgrade_request") {
          if (!request_id) {
            return new Response(JSON.stringify({ error: "request_id required" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const { data: reqRow, error: reqErr } = await admin
            .from("upgrade_requests")
            .select("id, business_id, status")
            .eq("id", request_id)
            .maybeSingle();
          if (reqErr) throw reqErr;
          if (!reqRow) {
            return new Response(JSON.stringify({ error: "Upgrade request not found" }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          business_id = reqRow.business_id;
        }

        const { new_plan, billing_cycle, duration_days, reason } = body as {
          new_plan?: string;
          billing_cycle?: "monthly" | "annual";
          duration_days?: number | null;
          reason?: string;
        };
        const ALLOWED_PLANS = ["starter", "growth", "scale"];
        const ALLOWED_CYCLES = ["monthly", "annual"];
        if (!business_id || !new_plan || !ALLOWED_PLANS.includes(new_plan)) {
          return new Response(JSON.stringify({ error: "Invalid business_id or new_plan" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (billing_cycle && !ALLOWED_CYCLES.includes(billing_cycle)) {
          return new Response(JSON.stringify({ error: "Invalid billing_cycle" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!reason || !reason.trim()) {
          return new Response(JSON.stringify({ error: "reason is required" }), {
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

        // Duration: number of days from now; null/undefined = no expiry.
        let current_period_end: string | null = null;
        if (typeof duration_days === "number" && duration_days > 0) {
          current_period_end = new Date(Date.now() + duration_days * 86400000).toISOString();
        }

        const grantedAt = new Date().toISOString();
        const update: Record<string, unknown> = {
          plan: new_plan,
          status: "active",
          activation_source: "manual_admin",
          granted_by: user.id,
          grant_reason: reason.trim(),
          granted_at: grantedAt,
          current_period_end,
          updated_at: grantedAt,
        };
        if (billing_cycle) update.billing_cycle = billing_cycle;

        const { error: updErr } = await admin
          .from("subscriptions")
          .update(update)
          .eq("id", existing.id);
        if (updErr) throw updErr;

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
            billing_cycle: billing_cycle ?? null,
            duration_days: duration_days ?? null,
            current_period_end,
            reason: reason.trim(),
            admin_email: user.email,
            via: action,
            request_id: request_id ?? null,
            timestamp: grantedAt,
          },
        });

        if (action === "approve_upgrade_request" && request_id) {
          await admin
            .from("upgrade_requests")
            .update({
              status: "approved",
              resolved_by: user.id,
              resolved_at: grantedAt,
              resolution_note: reason.trim(),
              updated_at: grantedAt,
            })
            .eq("id", request_id);
        }

        result = { success: true, old_plan, new_plan, current_period_end };
        break;
      }
      case "reject_upgrade_request": {
        const { request_id, note } = body as { request_id?: string; note?: string };
        if (!request_id) {
          return new Response(JSON.stringify({ error: "request_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const now = new Date().toISOString();
        const { error: rejErr } = await admin
          .from("upgrade_requests")
          .update({
            status: "rejected",
            resolved_by: user.id,
            resolved_at: now,
            resolution_note: note?.trim() || null,
            updated_at: now,
          })
          .eq("id", request_id);
        if (rejErr) throw rejErr;
        result = { success: true };
        break;
      }
      case "reply_ticket": {
        const { ticket_id, content } = body;
        const { error } = await admin.from("ticket_messages").insert({
          ticket_id,
          sender_type: "admin",
          sender_name: "Suvee Support",
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
