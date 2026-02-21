import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // BitPay sends IPN (Instant Payment Notification) with event and data
    const event = body.event?.name || body.status;
    const invoiceData = body.data || body;
    const invoiceId = invoiceData.id;
    const status = invoiceData.status;

    console.log(`BitPay webhook received: event=${event}, invoiceId=${invoiceId}, status=${status}`);

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoice ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse posData to get user_id and plan info
    let posData: { user_id?: string; plan?: string; billing?: string } = {};
    try {
      posData = typeof invoiceData.posData === "string"
        ? JSON.parse(invoiceData.posData)
        : invoiceData.posData || {};
    } catch {
      console.warn("Could not parse posData:", invoiceData.posData);
    }

    const userId = posData.user_id;
    const plan = posData.plan || "pro";
    const billing = posData.billing || "monthly";

    if (!userId) {
      console.error("No user_id in posData for invoice:", invoiceId);
      return new Response(JSON.stringify({ error: "Missing user_id in posData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment record status
    const paymentStatus = mapBitPayStatus(status);
    await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        metadata: {
          plan,
          billing,
          invoice_id: invoiceId,
          payment_currency: invoiceData.paymentCurrency || "XRP",
          bitpay_status: status,
          amount_paid: invoiceData.amountPaid,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("provider_payment_id", invoiceId)
      .eq("payment_provider", "bitpay");

    // If payment is confirmed/complete, activate the subscription
    if (status === "confirmed" || status === "complete") {
      console.log(`Activating Pro subscription for user ${userId} via BitPay XRP`);

      const now = new Date();
      const periodEnd = new Date(now);
      if (billing === "annual") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Upsert subscription to pro
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingSub) {
        await supabase
          .from("subscriptions")
          .update({
            plan: "pro",
            status: "active",
            payment_provider: "bitpay",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
          })
          .eq("id", existingSub.id);
      } else {
        await supabase
          .from("subscriptions")
          .insert({
            user_id: userId,
            plan: "pro",
            status: "active",
            payment_provider: "bitpay",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          });
      }
    }

    return new Response(JSON.stringify({ success: true, status: paymentStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("BitPay webhook error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapBitPayStatus(bitpayStatus: string): string {
  switch (bitpayStatus) {
    case "new":
      return "pending";
    case "paid":
      return "processing";
    case "confirmed":
    case "complete":
      return "completed";
    case "expired":
      return "expired";
    case "invalid":
      return "failed";
    default:
      return "pending";
  }
}
