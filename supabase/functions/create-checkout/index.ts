import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, Record<string, number>> = {
  pro: {
    monthly: 997,  // $9.97 in cents
    annual: 8900,  // $89.00 in cents
  },
};

async function getProviderKeys(supabase: any, userId: string, provider: string): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("provider_settings")
    .select("key_name, key_value")
    .eq("user_id", userId)
    .eq("provider", provider);

  const keys: Record<string, string> = {};
  (data || []).forEach((row: any) => {
    keys[row.key_name] = row.key_value;
  });
  return keys;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, plan, billing = "monthly" } = await req.json();

    if (!provider || !plan || !PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: "Invalid plan or provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceAmount = PLAN_PRICES[plan][billing] || PLAN_PRICES[plan].monthly;
    const interval = billing === "annual" ? "year" : "month";
    const priceLabel = billing === "annual" ? "$89.00/year" : "$9.97/month";

    // Try env vars first, then fall back to DB-stored keys
    const dbKeys = await getProviderKeys(supabase, user.id, provider);

    switch (provider) {
      case "stripe": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || dbKeys.secret_key;
        if (!stripeKey) {
          return new Response(
            JSON.stringify({
              error: "Stripe not configured",
              message: "Please add your Stripe API keys in Settings → Payment Providers.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const origin = req.headers.get("origin") || "https://babycam.io";
        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "mode": "subscription",
            "customer_email": user.email!,
            "metadata[user_id]": user.id,
            "metadata[plan]": plan,
            "metadata[billing]": billing,
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][unit_amount]": priceAmount.toString(),
            "line_items[0][price_data][recurring][interval]": interval,
            "line_items[0][price_data][product_data][name]": `BabyCam Pro (${billing === "annual" ? "Annual" : "Monthly"})`,
            "line_items[0][price_data][product_data][description]": `Enterprise-grade 4K baby monitoring — ${priceLabel}`,
            "line_items[0][quantity]": "1",
            "success_url": `${origin}/dashboard?payment=success`,
            "cancel_url": `${origin}/pricing?payment=canceled`,
          }).toString(),
        });

        const session = await stripeRes.json();
        if (session.error) {
          throw new Error(session.error.message);
        }

        return new Response(
          JSON.stringify({ url: session.url, provider: "stripe" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "paypal": {
        const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID") || dbKeys.client_id;
        const paypalSecret = Deno.env.get("PAYPAL_SECRET") || dbKeys.secret;
        if (!paypalClientId || !paypalSecret) {
          return new Response(
            JSON.stringify({
              error: "PayPal not configured",
              message: "Please add your PayPal API keys in Settings → Payment Providers.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get PayPal access token
        const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(paypalClientId + ":" + paypalSecret)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
          throw new Error("Failed to authenticate with PayPal");
        }

        const origin = req.headers.get("origin") || "https://babycam.io";
        const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              amount: { currency_code: "USD", value: billing === "annual" ? "89.00" : "9.97" },
              description: `BabyCam Pro ${billing === "annual" ? "Annual" : "Monthly"}`,
              custom_id: user.id,
            }],
            application_context: {
              return_url: `${origin}/dashboard?payment=success&provider=paypal`,
              cancel_url: `${origin}/pricing?payment=canceled`,
              brand_name: "BabyCam.io",
            },
          }),
        });

        const order = await orderRes.json();
        const approveLink = order.links?.find((l: any) => l.rel === "approve");
        if (!approveLink) {
          throw new Error("Failed to create PayPal order");
        }

        return new Response(
          JSON.stringify({ url: approveLink.href, provider: "paypal" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "paymongo": {
        const paymongoKey = Deno.env.get("PAYMONGO_SECRET_KEY") || dbKeys.secret_key;
        if (!paymongoKey) {
          return new Response(
            JSON.stringify({
              error: "PayMongo not configured",
              message: "Please add your PayMongo API keys in Settings → Payment Providers.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const origin = req.headers.get("origin") || "https://babycam.io";
        const pmRes = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(paymongoKey + ":")}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            data: {
              attributes: {
                line_items: [{
                  name: `BabyCam Pro ${billing === "annual" ? "Annual" : "Monthly"}`,
                  amount: priceAmount,
                  currency: "PHP",
                  quantity: 1,
                }],
                payment_method_types: ["gcash", "paymaya"],
                success_url: `${origin}/dashboard?payment=success`,
                cancel_url: `${origin}/pricing?payment=canceled`,
                metadata: { user_id: user.id, plan },
              },
            },
          }),
        });

        const pmSession = await pmRes.json();
        if (pmSession.errors) {
          throw new Error(pmSession.errors[0]?.detail || "PayMongo error");
        }

        return new Response(
          JSON.stringify({ url: pmSession.data.attributes.checkout_url, provider: "paymongo" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "mpesa": {
        const mpesaKey = Deno.env.get("MPESA_CONSUMER_KEY") || dbKeys.consumer_key;
        const mpesaSecret = Deno.env.get("MPESA_CONSUMER_SECRET") || dbKeys.consumer_secret;
        if (!mpesaKey || !mpesaSecret) {
          return new Response(
            JSON.stringify({
              error: "M-Pesa not configured",
              message: "Please add your M-Pesa API keys in Settings → Payment Providers.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // M-Pesa Daraja STK Push
        const authRes = await fetch(
          "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
          {
            headers: {
              Authorization: `Basic ${btoa(mpesaKey + ":" + mpesaSecret)}`,
            },
          }
        );
        const authData = await authRes.json();
        if (!authData.access_token) {
          throw new Error("Failed to authenticate with M-Pesa");
        }

        return new Response(
          JSON.stringify({
            message: "M-Pesa authenticated successfully. STK Push ready.",
            provider: "mpesa",
            authenticated: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unsupported payment provider" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
