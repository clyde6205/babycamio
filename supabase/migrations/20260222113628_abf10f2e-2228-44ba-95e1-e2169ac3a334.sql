
-- ============================================================
-- FIX #1: Replace overly permissive SELECT policies with owner-scoped ones
-- ============================================================

-- ROOMS: Drop public SELECT, replace with owner + shared access
DROP POLICY IF EXISTS "Anyone can view all rooms" ON public.rooms;
CREATE POLICY "Users can view own rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM shared_access sa
      WHERE sa.room_id = rooms.id
        AND sa.is_active = true
        AND sa.shared_with_email = (auth.jwt() ->> 'email')
    )
  );

-- RECORDINGS: Drop public SELECT, replace with owner-only
DROP POLICY IF EXISTS "Anyone can view recordings" ON public.recordings;
CREATE POLICY "Users can view own recordings"
  ON public.recordings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- SLEEP_EVENTS: Drop public SELECT, replace with owner-only
DROP POLICY IF EXISTS "Anyone can view sleep events" ON public.sleep_events;
CREATE POLICY "Users can view own sleep events"
  ON public.sleep_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- USER_CAMERA_SETTINGS: Drop public SELECT, replace with owner-only
DROP POLICY IF EXISTS "Anyone can view camera settings" ON public.user_camera_settings;
CREATE POLICY "Users can view own camera settings"
  ON public.user_camera_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- PROFILES: Drop public SELECT, replace with authenticated owner-only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
