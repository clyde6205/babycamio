import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://babycam.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    const bitpayToken = Deno.env.get("BITPAY_API_TOKEN");
    if (!bitpayToken) return json({ error: "BitPay API token is not configured" }, 503);

    // BitPay IPNs are notifications, not trusted payment evidence. Retrieve the
    // invoice directly from BitPay before using its status, price, currency or posData.
    const notification = await req.json();
    const invoiceId = notification.data?.id || notification.id;
    if (typeof invoiceId !== "string" || !invoiceId.trim()) return json({ error: "Missing invoice ID" }, 400);

    const invoiceResponse = await fetch(
      `https://bitpay.com/invoices/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(bitpayToken)}`,
      { headers: { "X-Accept-Version": "2.0.0", Accept: "application/json" } },
    );
    if (!invoiceResponse.ok) {
      console.error("[BitPayWebhook] Invoice verification failed:", invoiceResponse.status);
      return json({ error: "Unable to verify BitPay invoice" }, 502);
    }
    const invoiceResponseBody = await invoiceResponse.json();
    const invoiceData = invoiceResponseBody.data || invoiceResponseBody;
    if (invoiceData.id !== invoiceId) return json({ error: "BitPay invoice ID mismatch" }, 400);
    if (String(invoiceData.currency || "").toUpperCase() !== "USD") return json({ error: "BitPay invoice currency does not match USD pricing" }, 400);
    const event = notification.event?.name || notification.status;

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
    const plan = posData.plan;
    const billing = posData.billing;
    if (!userId || !UUID_PATTERN.test(userId) || plan !== "pro" || !["monthly", "annual"].includes(billing || "")) {
      return json({ error: "Missing or invalid checkout metadata in verified BitPay invoice" }, 400);
    }

    const paymentStatus = mapBitPayStatus(status);
    const invoiceCreatedAt = Number(invoiceData.invoiceTime);
    if (
      (status === "confirmed" || status === "complete") &&
      (!Number.isFinite(invoiceCreatedAt) || invoiceCreatedAt <= 0)
    ) {
      return json({ error: "Verified BitPay invoice is missing its creation time" }, 400);
    }
    const amountCents = Number.isFinite(Number(invoiceData.price)) ? Math.round(Number(invoiceData.price) * 100) : 0;
    if (amountCents !== 1097 && amountCents !== 9900) {
      return json({ error: "BitPay invoice amount does not match an available plan" }, 400);
    }
    if ((billing === "annual" && amountCents !== 9900) || (billing === "monthly" && amountCents !== 1097)) {
      return json({ error: "BitPay invoice billing interval does not match its amount" }, 400);
    }
    const paymentMetadata = {
      plan,
      billing,
      invoice_id: invoiceId,
      payment_currency: invoiceData.paymentCurrency || "XRP",
      bitpay_status: status,
      amount_paid: invoiceData.amountPaid,
      updated_at: new Date().toISOString(),
    };

    const paymentValues = {
      user_id: userId,
      amount_cents: amountCents,
      currency: (invoiceData.currency || "USD").toUpperCase(),
      payment_provider: "bitpay",
      provider_payment_id: invoiceId,
      status: paymentStatus,
      metadata: paymentMetadata,
    };
    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from("payments")
      .select("id, user_id")
      .eq("provider_payment_id", invoiceId)
      .eq("payment_provider", "bitpay")
      .maybeSingle();
    if (existingPaymentError) throw existingPaymentError;

    if (existingPayment) {
      if (existingPayment.user_id !== userId) throw new Error("BitPay invoice is already attached to a different account");
      const { error } = await supabase.from("payments").update({
        amount_cents: amountCents,
        currency: paymentValues.currency,
        status: paymentStatus,
        metadata: paymentMetadata,
      }).eq("id", existingPayment.id);
      if (error) throw error;
    } else {
      const { error: insertError } = await supabase.from("payments").insert(paymentValues);
      if (insertError?.code === "23505") {
        // Another delivery may have inserted this invoice after our initial read.
        const { data: racedPayment, error: racedReadError } = await supabase
          .from("payments")
          .select("id, user_id")
          .eq("payment_provider", "bitpay")
          .eq("provider_payment_id", invoiceId)
          .maybeSingle();
        if (racedReadError) throw racedReadError;
        if (!racedPayment || racedPayment.user_id !== userId) {
          throw new Error("BitPay invoice payment record could not be safely reconciled");
        }
        const { error: racedUpdateError } = await supabase.from("payments").update({
          amount_cents: amountCents,
          currency: paymentValues.currency,
          status: paymentStatus,
          metadata: paymentMetadata,
        }).eq("id", racedPayment.id);
        if (racedUpdateError) throw racedUpdateError;
      } else if (insertError) {
        throw insertError;
      }
    }

    // BitPay considers confirmed/complete safe for goods delivery; "paid" is not final.
    if ((status === "confirmed" || status === "complete") && plan === "pro") {
      // Anchor the subscription window to the immutable invoice creation time
      // so repeated IPN deliveries do not extend the subscription repeatedly.
      const periodStart = new Date(invoiceCreatedAt);
      const periodEnd = new Date(periodStart);
      if (billing === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: subscriptionWriteError } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan: "pro",
        status: "active",
        payment_provider: "bitpay",
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      }, { onConflict: "user_id" });
      if (subscriptionWriteError) throw subscriptionWriteError;
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
    case "complete": return "succeeded";
    case "expired":
    case "invalid": return "failed";
    default: return "pending";
  }
}
