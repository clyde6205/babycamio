-- Prevent duplicate payment rows when a provider webhook races the checkout response
-- or when a provider retries the same invoice notification.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE provider_payment_id IS NOT NULL
    GROUP BY payment_provider, provider_payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate provider payment IDs exist; reconcile payments before applying payments_provider_payment_unique';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_unique
ON public.payments (payment_provider, provider_payment_id);
