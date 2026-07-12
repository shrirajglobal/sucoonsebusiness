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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log("env check:", {
      hasUrl: !!supabaseUrl,
      urlHost: supabaseUrl ? new URL(supabaseUrl).host : null,
      hasAnon: !!anonKey,
      hasService: !!serviceKey,
      serviceLen: serviceKey?.length ?? 0,
    });

    // Verify caller
    const anon = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const {
      email,
      name,
      phone,
      department,
      salary,
      designation,
      role,
      team_member_id,
    } = body ?? {};

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return json({ error: "Valid email is required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Resolve caller's business + role
    const { data: profile } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", callerId)
      .maybeSingle();
    const businessId = profile?.business_id;
    if (!businessId) return json({ error: "No business context" }, 403);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!roleRow || !["owner", "admin"].includes(roleRow.role)) {
      return json({ error: "Only owners and admins can invite members" }, 403);
    }

    // Sanitize desired role for the invite (never allow owner)
    const allowedRoles = ["admin", "manager", "executive", "field_staff"];
    const invitedRole = allowedRoles.includes(role) ? role : "executive";

    // Upsert team_members row
    let memberId = team_member_id as string | undefined;
    if (memberId) {
      const { error: updErr } = await admin
        .from("team_members")
        .update({
          email: cleanEmail,
          name: name ?? undefined,
          phone: phone ?? undefined,
          department: department ?? undefined,
          salary: typeof salary === "number" ? salary : undefined,
          designation: designation ?? undefined,
        })
        .eq("id", memberId)
        .eq("business_id", businessId);
      if (updErr) return json({ error: updErr.message }, 400);
    } else {
      // If a member row with same email already exists for this business, reuse it
      const { data: existing } = await admin
        .from("team_members")
        .select("id, user_id")
        .eq("business_id", businessId)
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (existing?.user_id) {
        return json({
          status: "already_linked",
          message: "This member is already active.",
        });
      }

      if (existing) {
        memberId = existing.id;
        await admin
          .from("team_members")
          .update({
            name: name ?? undefined,
            phone: phone ?? undefined,
            department: department ?? undefined,
            salary: typeof salary === "number" ? salary : undefined,
            designation: designation ?? undefined,
          })
          .eq("id", memberId);
      } else {
        const { data: inserted, error: insErr } = await admin
          .from("team_members")
          .insert({
            business_id: businessId,
            name: name || cleanEmail,
            email: cleanEmail,
            phone: phone ?? null,
            department: department ?? null,
            salary: typeof salary === "number" ? salary : 0,
            designation: designation ?? null,
          })
          .select("id")
          .single();
        if (insErr) return json({ error: insErr.message }, 400);
        memberId = inserted.id;
      }
    }

    // Build a signup link the owner shares with the invitee.
    // The DB trigger handle_new_user() auto-links the new auth user to this
    // business by matching team_members.email, so we don't need Supabase's
    // admin invite API (which isn't reachable on managed Lovable Cloud).
    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
      Deno.env.get("SITE_URL") ||
      "";
    const inviteLink = origin
      ? `${origin}/signup?invite=${encodeURIComponent(cleanEmail)}`
      : "";

    return json({
      status: "link_generated",
      team_member_id: memberId,
      invite_link: inviteLink,
      message:
        `Share this signup link with ${cleanEmail}. They'll join your business automatically after creating a password.`,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
