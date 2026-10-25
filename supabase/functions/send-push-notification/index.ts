import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ALERT_TYPES = new Set(["motion", "cry", "disconnect", "battery"]);

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
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Push service is not configured" }, 503);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const { userId, roomName, alertType, message } = await req.json();
    if (!UUID_PATTERN.test(String(userId || ""))) return json({ error: "Invalid user" }, 400);

    const isServiceRole = token === serviceRoleKey;
    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user || user.id !== userId) return json({ error: "Forbidden" }, 403);
    }

    const cleanRoomName = String(roomName || "unknown").slice(0, 200);
    const cleanAlertType = ALLOWED_ALERT_TYPES.has(alertType) ? alertType : "motion";
    const cleanMessage = String(message || `Activity detected in ${cleanRoomName}`).slice(0, 500);

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, platform")
      .eq("user_id", userId);

    const title = cleanAlertType === "cry"
      ? "Baby crying"
      : cleanAlertType === "battery"
        ? "Camera battery low"
        : cleanAlertType === "disconnect"
          ? "Camera offline"
          : "Motion detected";

    // This records the notification intent. Actual Web Push/FCM delivery requires
    // provider credentials and should remain server-side when configured.
    for (const subscription of subscriptions || []) {
      console.log(`[Push] Queued for ${subscription.platform}: ${title} - ${cleanMessage}`);
    }

    await supabase.from("sleep_events").insert({
      user_id: userId,
      room_name: cleanRoomName,
      event_type: cleanAlertType,
      intensity: 1.0,
    });

    return json({ sent: subscriptions?.length || 0, title, body: cleanMessage });
  } catch (error) {
    console.error("[Push] Error:", error);
    return json({ error: "An error occurred processing your request" }, 500);
  }
});
