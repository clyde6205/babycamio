-- BitPay is an enabled global checkout provider. Keep all previously
-- supported subscription providers while explicitly allowing BitPay.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_payment_provider_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_payment_provider_check
  CHECK (
    payment_provider IS NULL OR
    payment_provider = ANY (
      ARRAY['stripe', 'paypal', 'paymongo', 'mpesa', 'referral', 'bitpay']::text[]
    )
  );
