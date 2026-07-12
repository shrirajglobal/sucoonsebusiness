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

    // Determine redirect URL — prefer request origin, fall back to configured site URL
    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      Deno.env.get("SITE_URL") ||
      "";
    const redirectTo = origin ? `${origin}/login` : undefined;

    // Try to send invite email via Supabase Auth
    const { data: inviteData, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(cleanEmail, {
        redirectTo,
        data: {
          invited_business_id: businessId,
          invited_role: invitedRole,
          full_name: name || undefined,
        },
      });

    // Fallback: if the default email service isn't available (common on hosted
    // projects without custom SMTP), generate an invite link the owner can
    // share manually (WhatsApp / copy-paste).
    if (inviteErr) {
      console.error(
        "inviteUserByEmail failed:",
        JSON.stringify(inviteErr, Object.getOwnPropertyNames(inviteErr)),
      );
      const rawMsg = inviteErr.message || "";
      const status = (inviteErr as any).status || 0;

      // User already exists → guide owner
      if (
        /already been registered|already registered|user already exists|email_exists/i
          .test(rawMsg) || status === 422
      ) {
        return json({
          status: "user_exists",
          team_member_id: memberId,
          message:
            "This email already has a Disha account. Ask them to sign in or use 'Forgot password' on the login page.",
        });
      }

      // Try generateLink as fallback
      const { data: linkData, error: linkErr } = await admin.auth.admin
        .generateLink({
          type: "invite",
          email: cleanEmail,
          options: {
            redirectTo,
            data: {
              invited_business_id: businessId,
              invited_role: invitedRole,
              full_name: name || undefined,
            },
          },
        });

      if (linkErr || !linkData?.properties?.action_link) {
        console.error(
          "generateLink also failed:",
          linkErr
            ? JSON.stringify(linkErr, Object.getOwnPropertyNames(linkErr))
            : "no link returned",
        );
        return json({
          error:
            "Email delivery is not configured for this project. Please configure SMTP in Backend → Auth settings, or contact support.",
        }, 400);
      }

      return json({
        status: "link_generated",
        team_member_id: memberId,
        invite_link: linkData.properties.action_link,
        message:
          `Email delivery isn't configured yet. Share this link with ${cleanEmail} to let them join.`,
      });
    }

    return json({
      status: "invited",
      team_member_id: memberId,
      user_id: inviteData?.user?.id ?? null,
      message: `Invite sent to ${cleanEmail}`,
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
