
-- 1. Sanitize handle_new_user with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_display_name TEXT;
BEGIN
  safe_display_name := substring(
    regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      '[^a-zA-Z0-9\s\-_]', '', 'g'
    ),
    1, 100
  );

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, safe_display_name);

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$;

-- 2. Fix open RLS on rooms (keep SELECT open for viewers, restrict write to owner)
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;

CREATE POLICY "Owners can create rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 3. Fix open RLS on recordings (keep SELECT open, restrict write to owner)
DROP POLICY IF EXISTS "Anyone can delete recordings" ON public.recordings;
DROP POLICY IF EXISTS "Anyone can insert recordings" ON public.recordings;

CREATE POLICY "Owners can insert recordings" ON public.recordings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete recordings" ON public.recordings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Fix open RLS on sleep_events (keep SELECT open, restrict write to owner)
DROP POLICY IF EXISTS "Anyone can delete sleep events" ON public.sleep_events;
DROP POLICY IF EXISTS "Anyone can insert sleep events" ON public.sleep_events;

CREATE POLICY "Owners can insert sleep events" ON public.sleep_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete sleep events" ON public.sleep_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Fix open RLS on user_camera_settings (restrict write to owner)
DROP POLICY IF EXISTS "Anyone can insert camera settings" ON public.user_camera_settings;
DROP POLICY IF EXISTS "Anyone can update camera settings" ON public.user_camera_settings;

CREATE POLICY "Owners can insert camera settings" ON public.user_camera_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update camera settings" ON public.user_camera_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
