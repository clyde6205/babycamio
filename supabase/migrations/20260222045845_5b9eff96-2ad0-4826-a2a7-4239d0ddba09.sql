
-- Open up rooms table for all access (anon + authenticated)
DROP POLICY IF EXISTS "Anyone authenticated can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone authenticated can view own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Owners can delete own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Owners can update own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Shared viewers can view rooms" ON public.rooms;

CREATE POLICY "Anyone can view all rooms" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.rooms FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete rooms" ON public.rooms FOR DELETE TO anon, authenticated USING (true);

-- Open up profiles for reading
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

-- Open up app_settings for anon reading
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

-- Open up recordings for anon access
DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON public.recordings;

CREATE POLICY "Anyone can view recordings" ON public.recordings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert recordings" ON public.recordings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete recordings" ON public.recordings FOR DELETE TO anon, authenticated USING (true);

-- Open up sleep_events
DROP POLICY IF EXISTS "Users can view own sleep events" ON public.sleep_events;
DROP POLICY IF EXISTS "Users can insert own sleep events" ON public.sleep_events;
DROP POLICY IF EXISTS "Users can delete own sleep events" ON public.sleep_events;

CREATE POLICY "Anyone can view sleep events" ON public.sleep_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert sleep events" ON public.sleep_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete sleep events" ON public.sleep_events FOR DELETE TO anon, authenticated USING (true);

-- Open up user_camera_settings
DROP POLICY IF EXISTS "Users can view own camera settings" ON public.user_camera_settings;
DROP POLICY IF EXISTS "Users can insert own camera settings" ON public.user_camera_settings;
DROP POLICY IF EXISTS "Users can update own camera settings" ON public.user_camera_settings;

CREATE POLICY "Anyone can view camera settings" ON public.user_camera_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert camera settings" ON public.user_camera_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update camera settings" ON public.user_camera_settings FOR UPDATE TO anon, authenticated USING (true);
