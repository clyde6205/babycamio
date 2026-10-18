import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://babycam.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, paymongo-signature",
};

const textEncoder = new TextEncoder();

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureCompare(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } | null {
  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value).filter(Boolean);
  return timestamp && signatures.length > 0 ? { timestamp, signatures } : null;
}

async function verifyStripeSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parsed = parseStripeSignature(header);
  if (!parsed) return false;

  const timestampSeconds = Number(parsed.timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60) return false;

  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${rawBody}`);
  return parsed.signatures.some((signature) => secureCompare(expected, signature));
}

function parsePayMongoSignature(header: string): { timestamp: string; test: string | null; live: string | null } | null {
  const values = new Map(header.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value] as const;
  }));
  const timestamp = values.get("t");
  if (!timestamp) return null;
  return { timestamp, test: values.get("te") || null, live: values.get("li") || null };
}

async function verifyPayMongoSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parsed = parsePayMongoSignature(header);
  if (!parsed) return false;

  const timestampSeconds = Number(parsed.timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60) return false;

  const mode = Deno.env.get("PAYMONGO_WEBHOOK_MODE") || "live";
  const supplied = mode === "test" ? parsed.test : parsed.live;
  if (!supplied) return false;

  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${rawBody}`);
  return secureCompare(expected, supplied);
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return json({ error: "Webhook service is not configured" }, 503);
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "stripe";
    const rawBody = await req.text();

    switch (provider) {
      case "stripe": {
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
        if (!webhookSecret) return json({ error: "Stripe webhook secret is not configured" }, 503);
        const verified = await verifyStripeSignature(rawBody, req.headers.get("stripe-signature"), webhookSecret);
        if (!verified) return json({ error: "Invalid Stripe webhook signature" }, 401);

        const event = JSON.parse(rawBody);
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const userId = session.metadata?.user_id;
          const plan = session.metadata?.plan === "pro" ? "pro" : "free";
          const billing = session.metadata?.billing === "annual" ? "annual" : "monthly";

          if (userId && plan === "pro") {
            const now = new Date();
            const periodEnd = new Date(now);
            if (billing === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            else periodEnd.setMonth(periodEnd.getMonth() + 1);

            await supabase.from("subscriptions").update({
              plan,
              status: "active",
              payment_provider: "stripe",
              provider_subscription_id: session.subscription,
              provider_customer_id: session.customer,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: false,
            }).eq("user_id", userId);

            await supabase.from("payments").insert({
              user_id: userId,
              amount_cents: session.amount_total || 0,
              currency: (session.currency || "usd").toUpperCase(),
              payment_provider: "stripe",
              provider_payment_id: session.payment_intent || session.id,
              status: "succeeded",
              metadata: { stripe_event_id: event.id, billing },
            });
          }
        }

        if (event.type === "customer.subscription.deleted") {
          const subscription = event.data.object;
          await supabase.from("subscriptions").update({
            plan: "free",
            status: "canceled",
            cancel_at_period_end: false,
          }).eq("provider_subscription_id", subscription.id);
        }
        break;
      }

      case "paymongo": {
        const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
        if (!webhookSecret) return json({ error: "PayMongo webhook secret is not configured" }, 503);
        const verified = await verifyPayMongoSignature(rawBody, req.headers.get("paymongo-signature"), webhookSecret);
        if (!verified) return json({ error: "Invalid PayMongo webhook signature" }, 401);

        const event = JSON.parse(rawBody);
        const data = event.data?.attributes;
        const eventType = event.data?.attributes?.type || event.data?.type;
        if ((eventType === "checkout_session.payment.paid" || data?.status === "paid") && data?.metadata?.user_id) {
          const userId = data.metadata.user_id;
          const billing = data.metadata?.billing === "annual" ? "annual" : "monthly";
          const now = new Date();
          const periodEnd = new Date(now);
          if (billing === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          else periodEnd.setMonth(periodEnd.getMonth() + 1);

          await supabase.from("subscriptions").update({
            plan: "pro",
            status: "active",
            payment_provider: "paymongo",
            provider_subscription_id: event.data.id,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
          }).eq("user_id", userId);

          await supabase.from("payments").insert({
            user_id: userId,
            amount_cents: data.amount || data.line_items?.[0]?.amount || 0,
            currency: (data.currency || "PHP").toUpperCase(),
            payment_provider: "paymongo",
            provider_payment_id: event.data.id,
            status: "succeeded",
            metadata: { paymongo_event_type: eventType, billing },
          });
        }
        break;
      }

      case "mpesa": {
        // Safaricom callbacks do not have an HMAC header. This endpoint is disabled until
        // a provider-specific shared secret/allow-list verification is configured.
        return json({ error: "M-Pesa webhook verification is not configured" }, 503);
      }

      default:
        return json({ error: "Unsupported payment provider" }, 400);
    }

    return json({ received: true });
  } catch (err) {
    console.error("[PaymentWebhook] Error:", err);
    return json({ error: "An error occurred processing your request" }, 500);
  }
});
