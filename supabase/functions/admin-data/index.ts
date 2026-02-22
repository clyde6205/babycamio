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
    let body: any = {};
    try { body = await req.json(); } catch { /* no body = default fetch */ }

    // Handle admin actions
    if (body.action === "update_motion_settings") {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: body.settings, updated_by: user.id })
        .eq("setting_key", "motion_recording");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "update_user_camera") {
      const { userId, field, value } = body;
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

    // Default: fetch all data
    const [profilesRes, roomsRes, subsRes, motionRes, userCameraRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("rooms").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("app_settings").select("setting_value").eq("setting_key", "motion_recording").single(),
      supabase.from("user_camera_settings").select("*").order("updated_at", { ascending: false }).limit(500),
    ]);

    const profiles = profilesRes.data || [];
    const rooms = roomsRes.data || [];
    const subscriptions = subsRes.data || [];

    const stats = {
      users: profiles.length,
      rooms: rooms.length,
      activeRooms: rooms.filter((r: any) => r.is_active).length,
      proUsers: subscriptions.filter((s: any) => s.plan === "pro" && s.status === "active").length,
    };

    return new Response(
      JSON.stringify({
        profiles,
        rooms,
        subscriptions,
        stats,
        motionSettings: motionRes.data?.setting_value || null,
        userCameraSettings: userCameraRes.data || [],
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
