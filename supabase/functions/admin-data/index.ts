import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
    let body: Record<string, unknown> = {};
    try { const parsed: unknown = await req.json(); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>; } catch { /* no body = default fetch */ }

    // Handle admin actions
    if (body.action === "update_motion_settings") {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: body.settings as Json, updated_by: user.id })
        .eq("setting_key", "motion_recording");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "update_user_camera") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const field = typeof body.field === "string" ? body.field : "";
      const value = body.value as Json;
      const allowedFields = ["recording_duration_minutes", "motion_enabled", "motion_sensitivity"];
      if (!allowedFields.includes(field)) throw new Error("Invalid field");
      
      // Upsert user camera settings
      const { data: existing } = await supabase
        .from("user_camera_settings")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_camera_settings")
          .update({ [field]: value })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_camera_settings")
          .insert({ user_id: userId, [field]: value });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    if (body.action === "set_plan") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const plan = body.plan === "pro" ? "pro" : body.plan === "free" ? "free" : "";
      const months = Number(body.months);
      if (!userId || !["free", "pro"].includes(plan)) return json({ error: "Invalid input" }, 400);
      const end = plan === "pro" ? new Date(Date.now() + (Number(months) || 1) * 30 * 86400000).toISOString() : null;
      const { data: existing } = await supabase.from("subscriptions").select("id").eq("user_id", userId).maybeSingle();
      const row = { plan, status: "active", payment_provider: plan === "pro" ? "admin_grant" : null, current_period_end: end };
      const { error } = existing
        ? await supabase.from("subscriptions").update(row).eq("user_id", userId)
        : await supabase.from("subscriptions").insert({ user_id: userId, ...row });
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "set_admin") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const grant = body.grant === true;
      if (!userId) return json({ error: "Invalid input" }, 400);
      if (!grant && userId === user.id) return json({ error: "You cannot remove your own admin role" }, 400);
      const { error } = grant
        ? await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" })
        : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "set_banned") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const banned = body.banned === true;
      if (!userId || userId === user.id) return json({ error: "Invalid input" }, 400);
      const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: banned ? "876000h" : "none" });
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "set_room_active") {
      const roomId = typeof body.roomId === "string" ? body.roomId : "";
      const active = body.active === true;
      const { error } = await supabase.from("rooms").update({ is_active: !!active }).eq("id", roomId);
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "delete_room") {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
      return json({ success: true });
    }

    // Default: fetch all data
    const [profilesRes, roomsRes, subsRes, motionRes, userCameraRes, referralsRes, rolesRes, authRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("rooms").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("app_settings").select("setting_value").eq("setting_key", "motion_recording").single(),
      supabase.from("user_camera_settings").select("*").order("updated_at", { ascending: false }).limit(1000),
      supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("user_roles").select("user_id, role"),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const authUsers = (authRes.data?.users || []).map((u) => ({
      id: u.id, email: u.email, last_sign_in_at: u.last_sign_in_at, confirmed: !!u.email_confirmed_at,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
    }));

    const profiles = profilesRes.data || [];
    const rooms = roomsRes.data || [];
    const subscriptions = subsRes.data || [];

    const stats = {
      users: profiles.length,
      rooms: rooms.length,
      activeRooms: rooms.filter((r) => r.is_active).length,
      proUsers: subscriptions.filter((s) => s.plan === "pro" && s.status === "active").length,
    };

    return new Response(
      JSON.stringify({
        profiles,
        rooms,
        subscriptions,
        stats,
        motionSettings: motionRes.data?.setting_value || null,
        userCameraSettings: userCameraRes.data || [],
        referrals: referralsRes.data || [],
        roles: rolesRes.data || [],
        authUsers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AdminData] Error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
