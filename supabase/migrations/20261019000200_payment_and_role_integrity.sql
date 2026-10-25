-- Final integrity constraints and least-privilege policies for account/payment data.

CREATE UNIQUE INDEX IF NOT EXISTS camera_heartbeats_user_room_unique
ON public.camera_heartbeats (user_id, room_name);

-- Subscription plans must be changed only by verified webhooks or admin/service-role code.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Payment history is read-only to its owner; service-role webhooks write it.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Role grants must never be self-service.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
