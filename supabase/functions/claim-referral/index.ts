import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REWARD_MS = 30 * 24 * 60 * 60 * 1000; // 1 month Pro each
const MAX_ACCOUNT_AGE_MS = 14 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Invalid token" }, 401);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,32}$/.test(code)) return json({ error: "Invalid code" }, 400);

    if (Date.now() - new Date(user.created_at).getTime() > MAX_ACCOUNT_AGE_MS)
      return json({ error: "Invite codes are for new accounts only" }, 400);

    const { data: already } = await supabase.from("referrals").select("id").eq("referred_user_id", user.id).limit(1);
    if (already && already.length) return json({ error: "You already used an invite" }, 400);

    const { data: owner } = await supabase.from("referrals").select("referrer_id").eq("referral_code", code).limit(1).maybeSingle();
    if (!owner) return json({ error: "Code not found" }, 404);
    if (owner.referrer_id === user.id) return json({ error: "You can't use your own code" }, 400);

    const now = new Date();
    const grantPro = async (userId: string) => {
      const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
      const base = sub?.plan === "pro" && sub.status === "active" && sub.current_period_end
        ? Math.max(new Date(sub.current_period_end).getTime(), now.getTime())
        : now.getTime();
      const end = new Date(base + REWARD_MS).toISOString();
      const row = sub?.plan === "pro" && sub.status === "active"
        ? { current_period_end: end }
        : { plan: "pro", status: "active", payment_provider: "referral", current_period_start: now.toISOString(), current_period_end: end, cancel_at_period_end: true };
      if (sub) await supabase.from("subscriptions").update(row).eq("id", sub.id);
      else await supabase.from("subscriptions").insert({ user_id: userId, ...row });
    };

    await grantPro(owner.referrer_id);
    await grantPro(user.id);
    await supabase.from("referrals").insert({
      referrer_id: owner.referrer_id, referral_code: `${code}-${user.id.slice(0, 8)}`,
      referred_user_id: user.id, referred_email: user.email, status: "rewarded", completed_at: now.toISOString(),
    });
    return json({ success: true });
  } catch (e) {
    console.error("[claim-referral]", e);
    return json({ error: "Server error" }, 500);
  }
});
