-- BitPay is a supported subscription provider after invoice verification is enabled.
-- Keep the accepted set aligned with the checkout providers exposed by the application.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_payment_provider_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_payment_provider_check
  CHECK (payment_provider IN ('stripe', 'paypal', 'paymongo', 'mpesa', 'bitpay', 'admin_grant'));
