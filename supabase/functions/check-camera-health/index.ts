import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://babycam.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-health-check-secret",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const schedulerSecret = Deno.env.get("HEALTH_CHECK_SECRET");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Health check is not configured" }, 503);

    const authorization = req.headers.get("Authorization");
    const suppliedSecret = req.headers.get("x-health-check-secret");
    const isServiceRole = authorization === `Bearer ${serviceRoleKey}`;
    const hasSchedulerSecret = Boolean(schedulerSecret && suppliedSecret === schedulerSecret);
    if (!isServiceRole && !hasSchedulerSecret) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: staleHeartbeats } = await supabase
      .from("camera_heartbeats")
      .select("id, user_id, room_name")
      .lt("last_heartbeat", twoMinutesAgo)
      .neq("status", "disconnected");

    if (!staleHeartbeats || staleHeartbeats.length === 0) {
      return json({ checked: true, stale: 0, message: "All cameras healthy" });
    }

    let alertsSent = 0;
    for (const heartbeat of staleHeartbeats) {
      await supabase
        .from("camera_heartbeats")
        .update({ status: "disconnected", stream_active: false })
        .eq("id", heartbeat.id);

      const roomFriendly = heartbeat.room_name?.replace(/-[a-z0-9]+$/i, "").replace(/-/g, " ") || "your room";
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId: heartbeat.user_id,
            roomName: heartbeat.room_name,
            alertType: "disconnect",
            message: `Camera in "${roomFriendly}" has gone offline. Check its connection.`,
          }),
        });
        alertsSent += 1;
      } catch (err) {
        console.error(`[HealthCheck] Failed to notify user ${heartbeat.user_id}:`, err);
      }

      await supabase.from("sleep_events").insert({
        user_id: heartbeat.user_id,
        room_name: heartbeat.room_name,
        event_type: "disconnect",
        intensity: 1.0,
      });
    }

    const { data: lowBattery } = await supabase
      .from("camera_heartbeats")
      .select("id, user_id, room_name, battery_level")
      .lt("battery_level", 15)
      .eq("status", "healthy");

    for (const heartbeat of lowBattery || []) {
      await supabase.from("camera_heartbeats").update({ status: "degraded" }).eq("id", heartbeat.id);
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId: heartbeat.user_id,
            roomName: heartbeat.room_name,
            alertType: "battery",
            message: `Camera battery is at ${heartbeat.battery_level}%. Plug it in soon.`,
          }),
        });
        alertsSent += 1;
      } catch (err) {
        console.error("[HealthCheck] Battery alert failed:", err);
      }
    }

    return json({
      checked: true,
      stale: staleHeartbeats.length,
      lowBattery: (lowBattery || []).length,
      alertsSent,
    });
  } catch (error) {
    console.error("[HealthCheck] Error:", error);
    return json({ error: "Health check failed" }, 500);
  }
});
