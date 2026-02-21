import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, number> = {
  pro: 997, // $9.97 in cents
};

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

    const { provider, plan } = await req.json();

    if (!provider || !plan || !PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: "Invalid plan or provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route to the correct payment provider
    switch (provider) {
      case "stripe": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
          return new Response(
            JSON.stringify({
              error: "Stripe not configured",
              message: "Stripe payment processing is being set up. Please try another payment method or check back soon.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create Stripe Checkout Session
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
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][unit_amount]": PLAN_PRICES[plan].toString(),
            "line_items[0][price_data][recurring][interval]": "month",
            "line_items[0][price_data][product_data][name]": "BabyCam Pro",
            "line_items[0][price_data][product_data][description]": "Enterprise-grade 4K baby monitoring",
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
        const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
        const paypalSecret = Deno.env.get("PAYPAL_SECRET");
        if (!paypalClientId || !paypalSecret) {
          return new Response(
            JSON.stringify({
              error: "PayPal not configured",
              message: "PayPal payment processing is being set up. Please try another payment method.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // PayPal integration placeholder - returns setup message
        return new Response(
          JSON.stringify({ message: "PayPal integration ready for configuration. API keys detected." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "paymongo": {
        const paymongoKey = Deno.env.get("PAYMONGO_SECRET_KEY");
        if (!paymongoKey) {
          return new Response(
            JSON.stringify({
              error: "PayMongo not configured",
              message: "GCash/Maya payments are being set up. Please try another payment method.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // PayMongo checkout for GCash/Maya
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
                  name: "BabyCam Pro Monthly",
                  amount: PLAN_PRICES[plan],
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
        const mpesaKey = Deno.env.get("MPESA_CONSUMER_KEY");
        const mpesaSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
        if (!mpesaKey || !mpesaSecret) {
          return new Response(
            JSON.stringify({
              error: "M-Pesa not configured",
              message: "M-Pesa payments are being set up. Please try another payment method.",
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ message: "M-Pesa STK push integration ready for configuration." }),
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
