import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BITPAY_API_URL = "https://bitpay.com";

const PLAN_PRICES: Record<string, Record<string, number>> = {
  pro: {
    monthly: 10.97,
    annual: 99.0,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const bitpayToken = Deno.env.get("BITPAY_API_TOKEN");
    if (!bitpayToken) {
      return new Response(
        JSON.stringify({
          error: "BitPay not configured",
          message: "BitPay API token is not set. Please contact the administrator.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan = "pro", billing = "monthly" } = await req.json();

    if (!PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const price = PLAN_PRICES[plan][billing] || PLAN_PRICES[plan].monthly;
    const origin = req.headers.get("origin") || "https://babycam.io";

    // Create BitPay invoice — user pays in XRP, you receive fiat settlement
    const invoiceRes = await fetch(`${BITPAY_API_URL}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Accept-Version": "2.0.0",
      },
      body: JSON.stringify({
        token: bitpayToken,
        price: price,
        currency: "USD",
        transactionSpeed: "medium",
        paymentCurrencies: ["XRP"],
        notificationURL: `${supabaseUrl}/functions/v1/bitpay-webhook`,
        redirectURL: `${origin}/dashboard?payment=success&provider=bitpay`,
        closeURL: `${origin}/pricing?payment=canceled`,
        buyer: {
          email: userEmail,
        },
        itemDesc: `BabyCam Pro ${billing === "annual" ? "Annual" : "Monthly"} Subscription`,
        posData: JSON.stringify({
          user_id: userId,
          plan: plan,
          billing: billing,
        }),
        orderId: `${userId}-${plan}-${billing}-${Date.now()}`,
      }),
    });

    const invoiceData = await invoiceRes.json();

    if (!invoiceRes.ok || invoiceData.error) {
      const errorMsg = invoiceData.error || invoiceData.errors?.[0]?.error || "BitPay API error";
      console.error("BitPay error:", JSON.stringify(invoiceData));
      throw new Error(`BitPay invoice creation failed: ${errorMsg}`);
    }

    const invoiceUrl = invoiceData.data?.url || invoiceData.url;
    const invoiceId = invoiceData.data?.id || invoiceData.id;

    if (!invoiceUrl) {
      throw new Error("BitPay did not return an invoice URL");
    }

    // Store the pending payment record
    await supabase.from("payments").insert({
      user_id: userId,
      amount_cents: Math.round(price * 100),
      currency: "USD",
      payment_provider: "bitpay",
      provider_payment_id: invoiceId,
      status: "pending",
      metadata: {
        plan,
        billing,
        invoice_id: invoiceId,
        payment_currency: "XRP",
      },
    });

    return new Response(
      JSON.stringify({
        url: invoiceUrl,
        provider: "bitpay",
        invoiceId: invoiceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[BitPayCheckout] Error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
