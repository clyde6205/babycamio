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


async function claimWebhookEvent(
  supabase: ReturnType<typeof createClient>,
  provider: string,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const { data: inserted, error: insertError } = await supabase
    .from("payment_webhook_events")
    .insert({ provider, event_id: eventId, event_type: eventType, status: "processing" })
    .select("event_id")
    .maybeSingle();

  if (!insertError) return Boolean(inserted);
  if (insertError.code !== "23505") throw insertError;

  const { data: existing, error: readError } = await supabase
    .from("payment_webhook_events")
    .select("status, received_at")
    .eq("provider", provider)
    .eq("event_id", eventId)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Webhook event claim could not be read");

  const ageMs = Date.now() - new Date(existing.received_at).getTime();
  if (existing.status === "processed") return false;
  if (existing.status === "processing" && ageMs < 5 * 60 * 1000) return false;

  const { error: retryError } = await supabase
    .from("payment_webhook_events")
    .update({
      status: "processing",
      event_type: eventType,
      received_at: new Date().toISOString(),
      processed_at: null,
      last_error: null,
    })
    .eq("provider", provider)
    .eq("event_id", eventId);
  if (retryError) throw retryError;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return json({ error: "Webhook service is not configured" }, 503);
  const supabase = createClient(supabaseUrl, supabaseKey);

  let activeEvent: { provider: string; eventId: string } | null = null;
  const rejectActiveEvent = async (body: unknown, status: number): Promise<Response> => {
    if (activeEvent) {
      const message = typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : "Webhook event rejected";
      const { error } = await supabase
        .from("payment_webhook_events")
        .update({ status: "failed", last_error: message.slice(0, 1000) })
        .eq("provider", activeEvent.provider)
        .eq("event_id", activeEvent.eventId);
      if (error) console.error("[PaymentWebhook] Could not mark rejected event:", error);
      activeEvent = null;
    }
    return json(body, status);
  };
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
        if (typeof event.id !== "string" || typeof event.type !== "string") {
          return json({ error: "Invalid Stripe event envelope" }, 400);
        }
        const claimed = await claimWebhookEvent(supabase, "stripe", event.id, event.type);
        if (!claimed) return json({ received: true, duplicate: true });
        activeEvent = { provider: "stripe", eventId: event.id };

        if (event.type === "checkout.session.completed") {
          const session = event.data?.object || {};
          const userId = session.metadata?.user_id;
          const billing = session.metadata?.billing;
          const expectedAmount = billing === "annual" ? 9900 : billing === "monthly" ? 1097 : 0;
          const userIdIsValid = typeof userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
          if (
            !userIdIsValid ||
            session.metadata?.plan !== "pro" ||
            !expectedAmount ||
            session.mode !== "subscription" ||
            session.status !== "complete" ||
            session.payment_status !== "paid" ||
            session.currency !== "usd" ||
            session.amount_total !== expectedAmount ||
            typeof session.subscription !== "string"
          ) {
            return await rejectActiveEvent({ error: "Stripe checkout does not match a valid BabyCam Pro purchase" }, 400);
          }

          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (!stripeKey) return await rejectActiveEvent({ error: "Stripe API is not configured" }, 503);
          const stripeSubscriptionResponse = await fetch(
            `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(session.subscription)}`,
            { headers: { Authorization: `Bearer ${stripeKey}` } },
          );
          if (!stripeSubscriptionResponse.ok) {
            console.error("[PaymentWebhook] Stripe subscription verification failed:", stripeSubscriptionResponse.status);
            throw new Error("Unable to verify the Stripe subscription");
          }
          const stripeSubscription = await stripeSubscriptionResponse.json();
          if (!["active", "trialing"].includes(stripeSubscription.status)) {
            return await rejectActiveEvent({ error: "Stripe subscription is not active" }, 409);
          }
          const periodStart = new Date(Number(stripeSubscription.current_period_start) * 1000);
          const periodEnd = new Date(Number(stripeSubscription.current_period_end) * 1000);
          if (!Number.isFinite(periodStart.getTime()) || !Number.isFinite(periodEnd.getTime()) || periodEnd <= periodStart) {
            throw new Error("Stripe returned an invalid subscription period");
          }

          const { error: subscriptionError } = await supabase.from("subscriptions").upsert({
            user_id: userId,
            plan: "pro",
            status: stripeSubscription.status === "trialing" ? "trialing" : "active",
            payment_provider: "stripe",
            provider_subscription_id: stripeSubscription.id,
            provider_customer_id: session.customer || stripeSubscription.customer,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
          }, { onConflict: "user_id" });
          if (subscriptionError) throw subscriptionError;

        }

        if (event.type === "invoice.paid") {
          const invoice = event.data?.object || {};
          const subscriptionId = typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id || invoice.parent?.subscription_details?.subscription;
          if (typeof subscriptionId === "string") {
            const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
            if (!stripeKey) return json({ error: "Stripe API is not configured" }, 503);
            const response = await fetch(
              `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
              { headers: { Authorization: `Bearer ${stripeKey}` } },
            );
            if (!response.ok) throw new Error("Unable to verify the renewed Stripe subscription");
            const stripeSubscription = await response.json();
            const userId = stripeSubscription.metadata?.user_id;
            const validUserId = typeof userId === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
            if (!validUserId || !["active", "trialing"].includes(stripeSubscription.status)) {
              return await rejectActiveEvent({ error: "Stripe invoice is not attached to an active BabyCam account" }, 400);
            }
            const periodStart = new Date(Number(stripeSubscription.current_period_start) * 1000);
            const periodEnd = new Date(Number(stripeSubscription.current_period_end) * 1000);
            if (!Number.isFinite(periodStart.getTime()) || !Number.isFinite(periodEnd.getTime()) || periodEnd <= periodStart) {
              throw new Error("Stripe returned an invalid renewed subscription period");
            }
            const { error: subscriptionError } = await supabase.from("subscriptions").upsert({
              user_id: userId,
              plan: "pro",
              status: stripeSubscription.status === "trialing" ? "trialing" : "active",
              payment_provider: "stripe",
              provider_subscription_id: stripeSubscription.id,
              provider_customer_id: stripeSubscription.customer,
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
            }, { onConflict: "user_id" });
            if (subscriptionError) throw subscriptionError;

            const amountPaid = Number(invoice.amount_paid || 0);
            if (amountPaid > 0 && typeof invoice.id === "string") {
              const { error: paymentError } = await supabase.from("payments").insert({
                user_id: userId,
                amount_cents: amountPaid,
                currency: String(invoice.currency || "usd").toUpperCase(),
                payment_provider: "stripe",
                provider_payment_id: invoice.id,
                status: "succeeded",
                metadata: { stripe_event_id: event.id, invoice_id: invoice.id, billing_reason: invoice.billing_reason || null },
              });
              if (paymentError) throw paymentError;
            }
          }
        }

        if (event.type === "customer.subscription.updated") {
          const subscription = event.data?.object || {};
          const { data: existing, error: existingError } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("provider_subscription_id", subscription.id)
            .maybeSingle();
          if (existingError) throw existingError;
          const userId = typeof subscription.metadata?.user_id === "string"
            ? subscription.metadata.user_id
            : existing?.user_id;
          if (userId) {
            const allowedStatuses = ["active", "trialing", "past_due", "canceled", "incomplete"];
            const status = allowedStatuses.includes(subscription.status) ? subscription.status : "canceled";
            const periodStart = new Date(Number(subscription.current_period_start) * 1000);
            const periodEnd = new Date(Number(subscription.current_period_end) * 1000);
            const { error } = await supabase.from("subscriptions").upsert({
              user_id: userId,
              plan: status === "canceled" || status === "incomplete" ? "free" : "pro",
              status,
              payment_provider: "stripe",
              provider_subscription_id: subscription.id,
              provider_customer_id: subscription.customer,
              current_period_start: Number.isFinite(periodStart.getTime()) ? periodStart.toISOString() : null,
              current_period_end: Number.isFinite(periodEnd.getTime()) ? periodEnd.toISOString() : null,
              cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
            }, { onConflict: "user_id" });
            if (error) throw error;
          }
        }

        if (event.type === "invoice.payment_failed") {
          const invoice = event.data?.object || {};
          const subscriptionId = typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id || invoice.parent?.subscription_details?.subscription;
          if (typeof subscriptionId === "string") {
            const { error } = await supabase.from("subscriptions").update({
              plan: "free",
              status: "past_due",
            }).eq("provider_subscription_id", subscriptionId);
            if (error) throw error;
          }
        }

        if (event.type === "customer.subscription.deleted") {
          const subscription = event.data.object;
          const { error } = await supabase.from("subscriptions").update({
            plan: "free",
            status: "canceled",
            cancel_at_period_end: false,
          }).eq("provider_subscription_id", subscription.id);
          if (error) throw error;
        }
        break;
      }

      case "paymongo": {
        const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
        if (!webhookSecret) return json({ error: "PayMongo webhook secret is not configured" }, 503);
        const verified = await verifyPayMongoSignature(rawBody, req.headers.get("paymongo-signature"), webhookSecret);
        if (!verified) return json({ error: "Invalid PayMongo webhook signature" }, 401);

        const event = JSON.parse(rawBody);
        if (typeof event.id !== "string" || typeof event.type !== "string") {
          return json({ error: "Invalid PayMongo event envelope" }, 400);
        }
        const claimed = await claimWebhookEvent(supabase, "paymongo", event.id, event.type);
        if (!claimed) return json({ received: true, duplicate: true });
        activeEvent = { provider: "paymongo", eventId: event.id };
        const eventAttributes = event.data?.attributes || {};
        const eventType = eventAttributes.type || event.data?.type;
        const resource = eventAttributes.data || event.data || {};
        const resourceAttributes = resource.attributes || resource;
        const metadata = resourceAttributes.metadata || {};
        const paid = eventType === "checkout_session.payment.paid" || eventType === "payment.paid" || resourceAttributes.status === "paid";

        if (paid && metadata.user_id) {
          const billing = metadata.billing === "annual" ? "annual" : "monthly";
          const now = new Date();
          const periodEnd = new Date(now);
          if (billing === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          else periodEnd.setMonth(periodEnd.getMonth() + 1);
          const providerPaymentId = String(resource.id || event.data.id);

          await supabase.from("subscriptions").update({
            plan: "pro",
            status: "active",
            payment_provider: "paymongo",
            provider_subscription_id: providerPaymentId,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
          }).eq("user_id", metadata.user_id);

          await supabase.from("payments").insert({
            user_id: metadata.user_id,
            amount_cents: resourceAttributes.amount || resourceAttributes.line_items?.[0]?.amount || 0,
            currency: (resourceAttributes.currency || "PHP").toUpperCase(),
            payment_provider: "paymongo",
            provider_payment_id: providerPaymentId,
            status: "succeeded",
            metadata: { paymongo_event_type: eventType, billing },
          });
        }
        break;
      }

      case "mpesa":
        return json({ error: "M-Pesa webhook verification is not configured" }, 503);

      default:
        return json({ error: "Unsupported payment provider" }, 400);
    }

    if (activeEvent) {
      const { error: completeError } = await supabase
        .from("payment_webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString(), last_error: null })
        .eq("provider", activeEvent.provider)
        .eq("event_id", activeEvent.eventId);
      if (completeError) throw completeError;
      activeEvent = null;
    }
    return json({ received: true });
  } catch (err) {
    if (activeEvent) {
      const message = err instanceof Error ? err.message : "Unknown webhook processing error";
      const { error: failedError } = await supabase
        .from("payment_webhook_events")
        .update({ status: "failed", last_error: message.slice(0, 1000) })
        .eq("provider", activeEvent.provider)
        .eq("event_id", activeEvent.eventId);
      if (failedError) console.error("[PaymentWebhook] Could not mark event failed:", failedError);
    }
    console.error("[PaymentWebhook] Error:", err);
    return json({ error: "An error occurred processing your request" }, 500);
  }
});
