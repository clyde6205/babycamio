import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "stripe";
    const body = await req.text();

    switch (provider) {
      case "stripe": {
        // In production, verify webhook signature with STRIPE_WEBHOOK_SECRET
        const event = JSON.parse(body);

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const userId = session.metadata?.user_id;
          const plan = session.metadata?.plan || "pro";

          if (userId) {
            // Update subscription
            await supabase
              .from("subscriptions")
              .update({
                plan,
                status: "active",
                payment_provider: "stripe",
                provider_subscription_id: session.subscription,
                provider_customer_id: session.customer,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq("user_id", userId);

            // Record payment
            await supabase.from("payments").insert({
              user_id: userId,
              amount_cents: session.amount_total || 997,
              currency: session.currency || "usd",
              payment_provider: "stripe",
              provider_payment_id: session.payment_intent,
              status: "succeeded",
            });
          }
        }

        if (event.type === "customer.subscription.deleted") {
          const sub = event.data.object;
          await supabase
            .from("subscriptions")
            .update({ plan: "free", status: "canceled", payment_provider: null })
            .eq("provider_subscription_id", sub.id);
        }

        break;
      }

      case "paymongo": {
        const event = JSON.parse(body);
        const data = event.data?.attributes;
        if (data?.status === "paid") {
          const userId = data.metadata?.user_id;
          if (userId) {
            await supabase
              .from("subscriptions")
              .update({
                plan: "pro",
                status: "active",
                payment_provider: "paymongo",
                provider_payment_id: event.data.id,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq("user_id", userId);

            await supabase.from("payments").insert({
              user_id: userId,
              amount_cents: data.line_items?.[0]?.amount || 997,
              currency: "PHP",
              payment_provider: "paymongo",
              provider_payment_id: event.data.id,
              status: "succeeded",
            });
          }
        }
        break;
      }

      case "mpesa": {
        const result = JSON.parse(body);
        // M-Pesa Daraja callback handling
        const callback = result.Body?.stkCallback;
        if (callback?.ResultCode === 0) {
          const metadata = callback.CallbackMetadata?.Item || [];
          const amount = metadata.find((i: any) => i.Name === "Amount")?.Value;
          const receipt = metadata.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
          // userId would be passed via AccountReference in STK push
          // Implementation depends on M-Pesa integration specifics
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
