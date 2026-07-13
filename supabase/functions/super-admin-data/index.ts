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
    // Verify caller is super admin
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

    // Verify user with anon client
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

    // Use service role for cross-business queries
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "overview";

    let data: Record<string, unknown> = {};

    if (view === "overview") {
      const [businesses, subscriptions, referrals, affiliates, tickets, profiles] =
        await Promise.all([
          admin.from("businesses").select("id, name, created_at"),
          admin.from("subscriptions").select("*"),
          admin.from("referrals").select("*"),
          admin.from("affiliates").select("*"),
          admin.from("support_tickets").select("*"),
          admin.from("profiles").select("id"),
        ]);

      data = {
        totalBusinesses: businesses.data?.length || 0,
        totalUsers: profiles.data?.length || 0,
        activeTrials: subscriptions.data?.filter(
          (s) => s.status === "active" && new Date(s.trial_end) > new Date()
        ).length || 0,
        expiredTrials: subscriptions.data?.filter(
          (s) => new Date(s.trial_end) <= new Date()
        ).length || 0,
        totalReferrals: referrals.data?.length || 0,
        rewardedReferrals: referrals.data?.filter((r) => r.status === "rewarded").length || 0,
        totalAffiliates: affiliates.data?.length || 0,
        pendingAffiliates: affiliates.data?.filter((a) => a.status === "pending").length || 0,
        openTickets: tickets.data?.filter((t) => t.status === "open").length || 0,
        totalTickets: tickets.data?.length || 0,
      };
    } else if (view === "businesses") {
      const { data: biz } = await admin
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: subs } = await admin.from("subscriptions").select("*");
      data = { businesses: biz || [], subscriptions: subs || [] };
    } else if (view === "subscriptions") {
      const { data: subs } = await admin
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: biz } = await admin.from("businesses").select("id, name");
      data = { subscriptions: subs || [], businesses: biz || [] };
    } else if (view === "referrals") {
      const { data: refs } = await admin
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      data = { referrals: refs || [] };
    } else if (view === "affiliates") {
      const { data: affs } = await admin
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: events } = await admin
        .from("affiliate_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      data = { affiliates: affs || [], events: events || [] };
    } else if (view === "tickets") {
      const { data: tickets } = await admin
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      data = { tickets: tickets || [] };
    } else if (view === "ticket_messages") {
      const ticketId = searchParams.get("ticket_id");
      const { data: messages } = await admin
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      data = { messages: messages || [] };
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
