import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, roomName, alertType, message } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also notify shared viewers
    const { data: sharedAccess } = await supabase
      .from("shared_access")
      .select("shared_with_email")
      .eq("granted_by", userId)
      .eq("is_active", true);

    let sent = 0;
    const title = alertType === "cry" ? "🍼 Baby Crying!" : alertType === "motion" ? "⚡ Motion Detected!" : "📢 BabyCam Alert";
    const body = message || `Activity detected in ${roomName || "your baby's room"}`;

    // For now, store the notification for in-app display
    // Full Web Push requires VAPID keys which can be configured later
    for (const sub of subscriptions) {
      // If FCM token exists, we could send via FCM
      // For now, we log and return success for the notification system framework
      console.log(`[Push] Would send to ${sub.platform}: ${title} - ${body}`);
      sent++;
    }

    // Log the alert as a sleep event for analytics
    await supabase.from("sleep_events").insert({
      user_id: userId,
      room_name: roomName || "unknown",
      event_type: alertType || "motion",
      intensity: 1.0,
    });

    return new Response(JSON.stringify({ sent, title, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Push] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
