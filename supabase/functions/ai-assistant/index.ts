import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    let businessId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
        businessId = profile?.business_id;
      }
    }

    if (!businessId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();

    // ============ Partner search mode ============
    if (body?.mode === 'partner_search') {
      const query: string = (body.query || '').toString().trim();
      if (!query) {
        return new Response(JSON.stringify({ results: [], reason: 'empty_query' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify partner_network eligibility
      const { data: biz } = await supabase
        .from('businesses')
        .select('business_type, modules')
        .eq('id', businessId)
        .maybeSingle();

      const eligibleType = biz && ['agency', 'real_estate', 'finance'].includes(biz.business_type ?? '');
      const moduleEnabled = Array.isArray(biz?.modules) && biz!.modules!.includes('partner_network');

      const { data: hasScale } = await supabase.rpc('business_has_scale_access', { _business_id: businessId });

      if (!eligibleType || !moduleEnabled || !hasScale) {
        return new Response(JSON.stringify({ results: [], reason: 'no_access' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Phase 6: product identity lives in the standalone products table now —
      // join through product_id rather than reading vendor_products directly.
      const { data: products } = await supabase
        .from('vendor_products')
        .select('id, unit_price, notes, vendor_id, vendors(name), products(name, category)')
        .eq('business_id', businessId)
        .limit(500);

      if (!products || products.length === 0) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const catalog = products.map((p: any) => ({
        id: p.id,
        product_name: p.products?.name ?? null,
        category: p.products?.category ?? null,
        unit_price: p.unit_price,
        notes: p.notes,
        vendor_name: p.vendors?.name ?? null,
      }));

      const sys = `You match a natural-language partner/vendor search query against a catalog of vendor products.
Return ONLY strict JSON of the form {"ids":["<id1>","<id2>",...]} listing product ids (from the given catalog) that best match the query, most relevant first.
Do not invent ids. If nothing matches, return {"ids":[]}. No prose, no code fences.`;

      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: `Query: ${query}\n\nCatalog:\n${JSON.stringify(catalog)}` },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded', results: [] }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'Payment required', results: [] }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI gateway error: ${aiRes.status}`);
      }

      const aiJson = await aiRes.json();
      let ids: string[] = [];
      try {
        const parsed = JSON.parse(aiJson.choices?.[0]?.message?.content || '{"ids":[]}');
        if (Array.isArray(parsed.ids)) ids = parsed.ids.filter((x: any) => typeof x === 'string');
      } catch { ids = []; }

      const byId = new Map(catalog.map((p) => [p.id, p]));
      const results = ids.map((id) => byId.get(id)).filter(Boolean);

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ Default chat mode ============
    // Fetch business context data
    const [tasksRes, leadsRes, customersRes, transactionsRes, inventoryRes] = await Promise.all([
      supabase.from("tasks").select("title, status, priority, due_date, assigned_to").eq("business_id", businessId).limit(100),
      supabase.from("leads").select("name, stage, value, source, created_at").eq("business_id", businessId).limit(100),
      supabase.from("customers").select("name, tier, lifetime_value, last_contact_date").eq("business_id", businessId).limit(100),
      supabase.from("transactions").select("type, category, amount, date").eq("business_id", businessId).limit(200),
      supabase.from("inventory_items").select("name, quantity, min_stock, cost_price, sell_price").eq("business_id", businessId).limit(100),
    ]);

    const contextData = {
      tasks: { total: tasksRes.data?.length || 0, byStatus: {} as Record<string, number>, overdue: 0 },
      leads: { total: leadsRes.data?.length || 0, totalValue: 0, byStage: {} as Record<string, number> },
      customers: { total: customersRes.data?.length || 0, totalLifetimeValue: 0 },
      finance: { totalIncome: 0, totalExpense: 0 },
      inventory: { totalItems: inventoryRes.data?.length || 0, lowStock: 0, totalValue: 0 },
    };

    const now = new Date();
    tasksRes.data?.forEach(t => {
      contextData.tasks.byStatus[t.status || 'todo'] = (contextData.tasks.byStatus[t.status || 'todo'] || 0) + 1;
      if (t.due_date && new Date(t.due_date) < now && t.status !== 'done') contextData.tasks.overdue++;
    });
    leadsRes.data?.forEach(l => {
      contextData.leads.totalValue += Number(l.value || 0);
      contextData.leads.byStage[l.stage] = (contextData.leads.byStage[l.stage] || 0) + 1;
    });
    customersRes.data?.forEach(c => { contextData.customers.totalLifetimeValue += Number(c.lifetime_value || 0); });
    transactionsRes.data?.forEach(t => {
      if (t.type === 'income') contextData.finance.totalIncome += Number(t.amount);
      else contextData.finance.totalExpense += Number(t.amount);
    });
    inventoryRes.data?.forEach(i => {
      contextData.inventory.totalValue += Number(i.quantity) * Number(i.cost_price);
      if (Number(i.quantity) <= Number(i.min_stock) && Number(i.min_stock) > 0) contextData.inventory.lowStock++;
    });

    const { messages } = body;

    const systemPrompt = `You are a helpful AI business assistant for an Indian business management platform called "Disha". 
You have access to the following real business data:

TASKS: ${JSON.stringify(contextData.tasks)}
LEADS/CRM: ${JSON.stringify(contextData.leads)}
CUSTOMERS: ${JSON.stringify(contextData.customers)}
FINANCE: ${JSON.stringify(contextData.finance)}
INVENTORY: ${JSON.stringify(contextData.inventory)}

Raw data samples:
- Recent tasks: ${JSON.stringify(tasksRes.data?.slice(0, 10))}
- Recent leads: ${JSON.stringify(leadsRes.data?.slice(0, 10))}
- Recent transactions: ${JSON.stringify(transactionsRes.data?.slice(0, 10))}
- Inventory items: ${JSON.stringify(inventoryRes.data?.slice(0, 10))}

Answer questions about this business data clearly and concisely. Use ₹ for currency. Provide actionable insights when possible.
If asked about data you don't have, say so honestly. Format numbers in Indian notation (lakhs/crores when appropriate).`;

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
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const reply = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
