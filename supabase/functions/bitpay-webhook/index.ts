import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://babycam.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const textEncoder = new TextEncoder();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function hmacSha256(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function secureCompare(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyBitPaySignature(rawBody: string, suppliedSignature: string | null): Promise<boolean> {
  const secret = Deno.env.get("BITPAY_WEBHOOK_SECRET");
  if (!secret || !suppliedSignature) return false;
  const expectedBytes = await hmacSha256(secret, rawBody);
  const supplied = suppliedSignature.trim();
  return secureCompare(supplied.toLowerCase(), toHex(expectedBytes)) || secureCompare(supplied, toBase64(expectedBytes));
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return json({ error: "Webhook service is not configured" }, 503);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!Deno.env.get("BITPAY_WEBHOOK_SECRET")) {
      return json({ error: "BitPay webhook secret is not configured" }, 503);
    }

    const rawBody = await req.text();
    const verified = await verifyBitPaySignature(rawBody, req.headers.get("x-signature"));
    if (!verified) return json({ error: "Invalid BitPay webhook signature" }, 401);

    const body = JSON.parse(rawBody);
    const event = body.event?.name || body.status;
    const invoiceData = body.data || body;
    const invoiceId = invoiceData.id;
    const status = invoiceData.status;

    console.log(`BitPay webhook received: event=${event}, invoiceId=${invoiceId}, status=${status}`);

    if (!invoiceId) return json({ error: "Missing invoice ID" }, 400);

    let posData: { user_id?: string; plan?: string; billing?: string } = {};
    try {
      posData = typeof invoiceData.posData === "string" ? JSON.parse(invoiceData.posData) : invoiceData.posData || {};
    } catch {
      console.warn("Could not parse BitPay posData");
    }

    const userId = posData.user_id;
    const plan = posData.plan === "pro" ? "pro" : "free";
    const billing = posData.billing === "annual" ? "annual" : "monthly";
    if (!userId || !UUID_PATTERN.test(userId)) return json({ error: "Missing or invalid user_id in posData" }, 400);

    const paymentStatus = mapBitPayStatus(status);
    const amountCents = Number.isFinite(Number(invoiceData.price)) ? Math.round(Number(invoiceData.price) * 100) : 0;
    const paymentMetadata = {
      plan,
      billing,
      invoice_id: invoiceId,
      payment_currency: invoiceData.paymentCurrency || "XRP",
      bitpay_status: status,
      amount_paid: invoiceData.amountPaid,
      updated_at: new Date().toISOString(),
    };

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("provider_payment_id", invoiceId)
      .eq("payment_provider", "bitpay")
      .maybeSingle();

    if (existingPayment) {
      await supabase.from("payments").update({ status: paymentStatus, metadata: paymentMetadata }).eq("id", existingPayment.id);
    } else {
      await supabase.from("payments").insert({
        user_id: userId,
        amount_cents: amountCents,
        currency: (invoiceData.currency || "USD").toUpperCase(),
        payment_provider: "bitpay",
        provider_payment_id: invoiceId,
        status: paymentStatus,
        metadata: paymentMetadata,
      });
    }

    // BitPay considers confirmed/complete safe for goods delivery; "paid" is not final.
    if ((status === "confirmed" || status === "complete") && plan === "pro") {
      const now = new Date();
      const periodEnd = new Date(now);
      if (billing === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSub) {
        await supabase.from("subscriptions").update({
          plan: "pro",
          status: "active",
          payment_provider: "bitpay",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        }).eq("id", existingSub.id);
      } else {
        await supabase.from("subscriptions").insert({
          user_id: userId,
          plan: "pro",
          status: "active",
          payment_provider: "bitpay",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
      }
    }

    return json({ success: true, status: paymentStatus });
  } catch (err: unknown) {
    console.error("[BitPayWebhook] Error:", err);
    return json({ error: "An error occurred processing your request" }, 500);
  }
});

function mapBitPayStatus(bitpayStatus: string): string {
  switch (bitpayStatus) {
    case "new": return "pending";
    case "paid": return "processing";
    case "confirmed":
    case "complete": return "completed";
    case "expired": return "expired";
    case "invalid": return "failed";
    default: return "pending";
  }
}
