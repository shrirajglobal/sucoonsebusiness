import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STARTER_MONTHLY_LIMIT = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await anonClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve business + plan
    const { data: profile } = await admin.from("profiles").select("business_id").eq("id", user.id).maybeSingle();
    const businessId = profile?.business_id;
    if (!businessId) {
      return new Response(JSON.stringify({ error: "No business" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: sub } = await admin.from("subscriptions").select("plan,status,trial_end,extra_days").eq("business_id", businessId).maybeSingle();
    const now = Date.now();
    const trialEndMs = sub?.trial_end ? new Date(sub.trial_end).getTime() + ((sub.extra_days || 0) * 86400000) : 0;
    const isTrialing = sub?.status === "trialing" && trialEndMs > now;
    // Trial grants Growth features → unlimited scans.
    const effectivePlan = isTrialing ? "growth" : (sub?.plan || "starter");

    if (effectivePlan === "starter") {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const monthISO = monthStart.toISOString().slice(0, 10);
      const { data: usage } = await admin.from("card_scan_usage").select("scan_count").eq("business_id", businessId).eq("month", monthISO).maybeSingle();
      const used = usage?.scan_count || 0;
      if (used >= STARTER_MONTHLY_LIMIT) {
        return new Response(JSON.stringify({
          error: `Monthly scan limit reached (${STARTER_MONTHLY_LIMIT} scans on Starter plan). Upgrade to Growth for unlimited scans.`,
          code: "SCAN_LIMIT_REACHED",
          used,
          limit: STARTER_MONTHLY_LIMIT,
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are a visiting card data extractor. Extract contact information from the visiting card image.\nReturn ONLY a JSON object with these fields (use null for missing fields):\n{\n  "name": "Full name of the person",\n  "company": "Company/organization name",\n  "designation": "Job title/designation",\n  "phone": "Phone number (with country code if visible)",\n  "email": "Email address",\n  "address": "Full address",\n  "website": "Website URL"\n}\nReturn ONLY the JSON, no markdown, no explanation.` },
          { role: "user", content: [ { type: "text", text: "Extract contact details from this visiting card:" }, { type: "image_url", image_url: { url: image } } ] }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI gateway error [${response.status}]: ${errText}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Could not parse card details", raw: content }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    Object.keys(extracted).forEach(k => { if (extracted[k] === null || extracted[k] === "null") extracted[k] = ""; });

    // Increment usage atomically after successful extraction
    await admin.rpc("increment_card_scan_usage", { _business_id: businessId });

    return new Response(JSON.stringify({ extracted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("card-scanner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
