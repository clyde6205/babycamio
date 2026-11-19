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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return json({ error: "Checkout service is not configured" }, 503);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Invalid token" }, 401);

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    const bitpayToken = Deno.env.get("BITPAY_API_TOKEN");
    if (!bitpayToken) {
      return json({
        error: "BitPay not configured",
        message: "BitPay checkout is temporarily unavailable.",
      }, 503);
    }

    const { plan = "pro", billing = "monthly" } = await req.json();
    if (!PLAN_PRICES[plan] || !["monthly", "annual"].includes(billing)) {
      return json({ error: "Invalid plan or billing interval" }, 400);
    }

    const price = PLAN_PRICES[plan][billing];
    const origin = getCheckoutOrigin(req);

    const invoiceRes = await fetch(`${BITPAY_API_URL}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Accept-Version": "2.0.0",
      },
      body: JSON.stringify({
        token: bitpayToken,
        price,
        currency: "USD",
        transactionSpeed: "medium",
        paymentCurrencies: ["XRP"],
        notificationURL: `${supabaseUrl}/functions/v1/bitpay-webhook`,
        extendedNotifications: true,
        redirectURL: `${origin}/dashboard?payment=success&provider=bitpay`,
        closeURL: `${origin}/pricing?payment=canceled`,
        buyer: { email: userEmail },
        itemDesc: `BabyCam Pro ${billing === "annual" ? "Annual" : "Monthly"} Subscription`,
        posData: JSON.stringify({ user_id: userId, plan, billing }),
        orderId: `${userId}-${plan}-${billing}-${crypto.randomUUID()}`,
      }),
    });

    const invoiceData = await invoiceRes.json();
    if (!invoiceRes.ok || invoiceData.error) {
      const errorMessage = invoiceData.error || invoiceData.errors?.[0]?.error || "BitPay API error";
      console.error("BitPay error:", JSON.stringify(invoiceData));
      throw new Error(`BitPay invoice creation failed: ${errorMessage}`);
    }

    const invoiceUrl = invoiceData.data?.url || invoiceData.url;
    const invoiceId = invoiceData.data?.id || invoiceData.id;
    if (!invoiceUrl || !invoiceId) throw new Error("BitPay did not return an invoice URL");

    await supabase.from("payments").insert({
      user_id: userId,
      amount_cents: Math.round(price * 100),
      currency: "USD",
      payment_provider: "bitpay",
      provider_payment_id: invoiceId,
      status: "pending",
      metadata: { plan, billing, invoice_id: invoiceId, payment_currency: "XRP" },
    });

    return json({ url: invoiceUrl, provider: "bitpay", invoiceId });
  } catch (err: unknown) {
    console.error("[BitPayCheckout] Error:", err);
    return json({ error: "An error occurred processing your request" }, 500);
  }
});
