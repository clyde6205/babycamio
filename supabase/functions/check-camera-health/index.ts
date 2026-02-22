import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find heartbeats older than 2 minutes (stale = likely disconnected)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: staleHeartbeats } = await supabase
      .from("camera_heartbeats")
      .select("*")
      .lt("last_heartbeat", twoMinutesAgo)
      .neq("status", "disconnected");

    if (!staleHeartbeats || staleHeartbeats.length === 0) {
      return new Response(JSON.stringify({ checked: true, stale: 0, message: "All cameras healthy ✅" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let alertsSent = 0;

    for (const hb of staleHeartbeats) {
      // Mark as disconnected
      await supabase
        .from("camera_heartbeats")
        .update({ status: "disconnected", stream_active: false })
        .eq("id", hb.id);

      // Send push notification to the camera owner
      const roomFriendly = hb.room_name?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ") || "your room";

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId: hb.user_id,
            roomName: hb.room_name,
            alertType: "disconnect",
            message: `⚠️ Camera in "${roomFriendly}" has gone offline! Check connection.`,
          }),
        });
        alertsSent++;
      } catch (err) {
        console.error(`[HealthCheck] Failed to notify user ${hb.user_id}:`, err);
      }

      // Log the disconnect event
      await supabase.from("sleep_events").insert({
        user_id: hb.user_id,
        room_name: hb.room_name,
        event_type: "disconnect",
        intensity: 1.0,
      });
    }

    // Also check for degraded cameras (low battery < 15%)
    const { data: lowBattery } = await supabase
      .from("camera_heartbeats")
      .select("*")
      .lt("battery_level", 15)
      .eq("status", "healthy");

    for (const hb of (lowBattery || [])) {
      await supabase
        .from("camera_heartbeats")
        .update({ status: "degraded" })
        .eq("id", hb.id);

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId: hb.user_id,
            roomName: hb.room_name,
            alertType: "battery",
            message: `🔋 Camera battery at ${hb.battery_level}%! Plug in soon.`,
          }),
        });
        alertsSent++;
      } catch (err) {
        console.error(`[HealthCheck] Battery alert failed:`, err);
      }
    }

    return new Response(JSON.stringify({
      checked: true,
      stale: staleHeartbeats.length,
      lowBattery: (lowBattery || []).length,
      alertsSent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[HealthCheck] Error:", error);
    return new Response(JSON.stringify({ error: "Health check failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
