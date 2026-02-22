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
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only admins can verify referrals
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { referral_id } = body;

    if (!referral_id) {
      return new Response(JSON.stringify({ error: "referral_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the referral
    const { data: referral, error: refErr } = await supabase
      .from("referrals")
      .select("*")
      .eq("id", referral_id)
      .single();

    if (refErr || !referral) {
      return new Response(JSON.stringify({ error: "Referral not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (referral.status === "rewarded") {
      return new Response(JSON.stringify({ error: "Already rewarded" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FREE_MONTHS = 2;
    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
    const rewardMs = FREE_MONTHS * msPerMonth;
    const now = new Date();

    // Helper: extend or create Pro subscription for a user
    const grantPro = async (userId: string) => {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (sub) {
        // If already pro & active, extend current_period_end
        if (sub.plan === "pro" && sub.status === "active" && sub.current_period_end) {
          const currentEnd = new Date(sub.current_period_end);
          const newEnd = new Date(Math.max(currentEnd.getTime(), now.getTime()) + rewardMs);
          const { error: upErr } = await supabase.from("subscriptions").update({
            current_period_end: newEnd.toISOString(),
          }).eq("id", sub.id);
          if (upErr) console.error("[grantPro] extend error:", upErr);
          else console.log("[grantPro] Extended Pro for", userId, "until", newEnd.toISOString());
        } else {
          // Upgrade to pro
          const newEnd = new Date(now.getTime() + rewardMs);
          const { error: upErr } = await supabase.from("subscriptions").update({
            plan: "pro",
            status: "active",
            payment_provider: "referral",
            current_period_start: now.toISOString(),
            current_period_end: newEnd.toISOString(),
            cancel_at_period_end: true,
          }).eq("id", sub.id);
          if (upErr) console.error("[grantPro] upgrade error:", upErr);
          else console.log("[grantPro] Upgraded to Pro for", userId, "until", newEnd.toISOString());
        }
      } else {
        // No subscription row — create one
        const newEnd = new Date(now.getTime() + rewardMs);
        await supabase.from("subscriptions").insert({
          user_id: userId,
          plan: "pro",
          status: "active",
          payment_provider: "referral",
          current_period_start: now.toISOString(),
          current_period_end: newEnd.toISOString(),
          cancel_at_period_end: true,
        });
      }
    };

    // Grant Pro to referrer
    await grantPro(referral.referrer_id);

    // Grant Pro to referred user if they exist
    if (referral.referred_user_id) {
      await grantPro(referral.referred_user_id);
    }

    // Mark referral as rewarded
    await supabase.from("referrals").update({
      status: "rewarded",
      completed_at: now.toISOString(),
    }).eq("id", referral_id);

    return new Response(JSON.stringify({
      success: true,
      message: `Both users granted ${FREE_MONTHS} months Pro!`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[VerifyReferral] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
