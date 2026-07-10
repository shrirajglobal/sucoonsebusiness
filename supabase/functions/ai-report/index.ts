import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // JWT auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { summary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ============ Enrich summary with risk/collections data ============
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await service
      .from("profiles").select("business_id").eq("id", user.id).maybeSingle();
    const businessId: string | null = profile?.business_id ?? null;

    const enriched: Record<string, unknown> = { ...summary };

    if (businessId) {
      const { data: biz } = await service
        .from("businesses").select("modules").eq("id", businessId).maybeSingle();
      const modules: string[] = Array.isArray(biz?.modules) ? (biz!.modules as string[]) : [];

      // Stale receivable commissions: partner_network module + receivable_since > 30 days
      if (modules.includes("partner_network")) {
        const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: stale } = await service
          .from("commission_transactions")
          .select("id, commission_amount, receivable_since, partner_order_id")
          .eq("business_id", businessId)
          .eq("status", "receivable")
          .lt("receivable_since", cutoff)
          .order("receivable_since", { ascending: true })
          .limit(50);
        if (stale && stale.length > 0) {
          enriched.stale_receivable_commissions = {
            count: stale.length,
            total_amount: stale.reduce((s, r: any) => s + Number(r.commission_amount || 0), 0),
            items: stale.map((r: any) => ({
              amount: Number(r.commission_amount || 0),
              days_outstanding: r.receivable_since
                ? Math.floor((Date.now() - new Date(r.receivable_since).getTime()) / 86400000)
                : null,
            })),
          };
        }
      }

      // Overdue fee installments: fee_schedule module + due_date < today AND status pending
      if (modules.includes("fee_schedule")) {
        const today = new Date().toISOString().split("T")[0];
        const { data: overdue } = await service
          .from("fee_installments")
          .select("id, amount, due_date, installment_number, fee_plan_id")
          .eq("business_id", businessId)
          .eq("status", "pending")
          .lt("due_date", today)
          .order("due_date", { ascending: true })
          .limit(100);
        if (overdue && overdue.length > 0) {
          enriched.overdue_fee_installments = {
            count: overdue.length,
            total_amount: overdue.reduce((s, r: any) => s + Number(r.amount || 0), 0),
            items: overdue.map((r: any) => ({
              amount: Number(r.amount || 0),
              due_date: r.due_date,
              days_overdue: Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000),
            })),
          };
        }
      }
    }

    const hasRiskSections = enriched.stale_receivable_commissions || enriched.overdue_fee_installments;

    const systemPrompt = `You are a business analyst AI. Generate a concise weekly health report for an Indian SMB/startup. 
Use markdown formatting with headers and bullet points. Be specific with numbers. Include:
1. Executive Summary (2-3 lines)
2. Tasks & Productivity (completed vs overdue, bottlenecks)
3. Sales Pipeline (lead flow, stage distribution, pipeline value)
4. Customer Engagement (coverage %, overdue contacts, recommendations)
5. Key Recommendations (3-5 actionable items)
6. Risk Alerts (if any)${hasRiskSections ? `
7. Collections & Receivables — cover stale_receivable_commissions and/or overdue_fee_installments if present in the data. Skip this section entirely if those fields are absent.` : ''}
Keep it practical and actionable. Use ₹ for currency. Be direct, not generic.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a weekly business health report based on this data:\n${JSON.stringify(enriched, null, 2)}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || "No report generated.";

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
