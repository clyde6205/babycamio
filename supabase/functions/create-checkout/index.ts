import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, Record<string, number>> = {
  pro: {
    monthly: 1097,
    annual: 9900,
  },
};

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getCheckoutOrigin(req: Request): string {
  const configuredOrigins = [
    Deno.env.get("APP_BASE_URL"),
    ...(Deno.env.get("ALLOWED_CHECKOUT_ORIGINS") || "").split(","),
    "https://babycam.io",
    "https://www.babycam.io",
    "https://localhost",
    "capacitor://localhost",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
  ]
    .map((origin) => normalizeOrigin(origin?.trim()))
    .filter((origin): origin is string => Boolean(origin));

  const requestedOrigin = normalizeOrigin(req.headers.get("origin"));
  if (requestedOrigin && configuredOrigins.includes(requestedOrigin)) return requestedOrigin;
  return normalizeOrigin(Deno.env.get("APP_BASE_URL")) || "https://babycam.io";
}

function configuredPhpCentavos(billing: "monthly" | "annual"): number | null {
  const value = Number(Deno.env.get(billing === "annual" ? "PAYMONGO_ANNUAL_PHP_CENTAVOS" : "PAYMONGO_MONTHLY_PHP_CENTAVOS"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return json({ error: "Checkout service is not configured" }, 503);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { provider, plan, billing = "monthly" } = await req.json();
    if (!provider || !plan || !PLAN_PRICES[plan]) return json({ error: "Invalid plan or provider" }, 400);
    if (!["monthly", "annual"].includes(billing)) return json({ error: "Invalid billing interval" }, 400);

    const priceAmount = PLAN_PRICES[plan][billing];
    if (provider === "stripe") {
      const { data: currentSubscription, error: subscriptionLookupError } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      if (subscriptionLookupError) throw subscriptionLookupError;
      const periodEnd = currentSubscription?.current_period_end
        ? new Date(currentSubscription.current_period_end).getTime()
        : 0;
      if (
        currentSubscription?.plan === "pro" &&
        ["active", "trialing"].includes(currentSubscription.status) &&
        (!periodEnd || periodEnd > Date.now())
      ) {
        return json({ error: "An active Pro subscription already exists. Manage it from your account instead." }, 409);
      }
    }
    const interval = billing === "annual" ? "year" : "month";
    const priceLabel = billing === "annual" ? "$99.00/year" : "$10.97/month";
    const origin = getCheckoutOrigin(req);

    switch (provider) {
      case "stripe": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
          return json({
            error: "Stripe not configured",
            message: "Stripe checkout is temporarily unavailable.",
          }, 503);
        }

        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            mode: "subscription",
            customer_email: user.email!,
            "metadata[user_id]": user.id,
            "metadata[plan]": plan,
            "metadata[billing]": billing,
            "subscription_data[metadata][user_id]": user.id,
            "subscription_data[metadata][plan]": plan,
            "subscription_data[metadata][billing]": billing,
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][unit_amount]": priceAmount.toString(),
            "line_items[0][price_data][recurring][interval]": interval,
            "line_items[0][price_data][product_data][name]": `BabyCam Pro (${billing === "annual" ? "Annual" : "Monthly"})`,
            "line_items[0][price_data][product_data][description]": `Private baby monitoring — ${priceLabel}`,
            "line_items[0][quantity]": "1",
            success_url: `${origin}/dashboard?payment=success`,
            cancel_url: `${origin}/pricing?payment=canceled`,
          }).toString(),
        });

        const session = await stripeRes.json();
        if (session.error) throw new Error(session.error.message);
        return json({ url: session.url, provider: "stripe" });
      }

      case "paypal": {
        return json({
          error: "PayPal checkout unavailable",
          message: "PayPal payments are disabled until verified capture is configured.",
        }, 503);
      }

      case "paymongo": {
        return json({
          error: "PayMongo checkout unavailable",
          message: "PayMongo remains disabled until its full payment and subscription renewal flow has passed staging verification.",
        }, 503);
      }

      case "mpesa": {
        return json({
          error: "M-Pesa checkout unavailable",
          message: "M-Pesa STK Push is not fully configured yet.",
        }, 503);
      }

      default:
        return json({ error: "Unsupported payment provider" }, 400);
    }
  } catch (err) {
    console.error("[CreateCheckout] Error:", err);
    return json({ error: "An error occurred processing your request" }, 500);
  }
});
