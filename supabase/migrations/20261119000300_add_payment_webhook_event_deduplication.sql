-- Record provider webhook events so retries cannot grant duplicate payments
-- or extend a subscription repeatedly. Only service-role webhook handlers write here.
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paymongo', 'bitpay')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  PRIMARY KEY (provider, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_webhook_events FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS payment_webhook_events_received_at_idx
ON public.payment_webhook_events (received_at DESC);
