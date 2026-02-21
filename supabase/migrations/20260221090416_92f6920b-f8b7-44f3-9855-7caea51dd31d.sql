-- Fix all RLS policies to restrict to authenticated users only
-- This prevents anonymous access to all user-specific tables

-- baby_care_logs
DROP POLICY IF EXISTS "Users can insert own care logs" ON public.baby_care_logs;
DROP POLICY IF EXISTS "Users can view own care logs" ON public.baby_care_logs;
DROP POLICY IF EXISTS "Users can update own care logs" ON public.baby_care_logs;
DROP POLICY IF EXISTS "Users can delete own care logs" ON public.baby_care_logs;
CREATE POLICY "Users can insert own care logs" ON public.baby_care_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own care logs" ON public.baby_care_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own care logs" ON public.baby_care_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own care logs" ON public.baby_care_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- baby_profiles
DROP POLICY IF EXISTS "Users can insert own baby profiles" ON public.baby_profiles;
DROP POLICY IF EXISTS "Users can view own baby profiles" ON public.baby_profiles;
DROP POLICY IF EXISTS "Users can update own baby profiles" ON public.baby_profiles;
DROP POLICY IF EXISTS "Users can delete own baby profiles" ON public.baby_profiles;
CREATE POLICY "Users can insert own baby profiles" ON public.baby_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own baby profiles" ON public.baby_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own baby profiles" ON public.baby_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own baby profiles" ON public.baby_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- caregiver_access
DROP POLICY IF EXISTS "Owners can manage caregiver access" ON public.caregiver_access;
DROP POLICY IF EXISTS "Caregivers can see their access" ON public.caregiver_access;
CREATE POLICY "Owners can manage caregiver access" ON public.caregiver_access FOR ALL TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Caregivers can see their access" ON public.caregiver_access FOR SELECT TO authenticated USING (caregiver_email = (auth.jwt() ->> 'email'::text));

-- growth_measurements
DROP POLICY IF EXISTS "Users can insert own growth data" ON public.growth_measurements;
DROP POLICY IF EXISTS "Users can view own growth data" ON public.growth_measurements;
DROP POLICY IF EXISTS "Users can delete own growth data" ON public.growth_measurements;
CREATE POLICY "Users can insert own growth data" ON public.growth_measurements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own growth data" ON public.growth_measurements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own growth data" ON public.growth_measurements FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- milestones
DROP POLICY IF EXISTS "Users can insert own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can view own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete own milestones" ON public.milestones;
CREATE POLICY "Users can insert own milestones" ON public.milestones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own milestones" ON public.milestones FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own milestones" ON public.milestones FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own milestones" ON public.milestones FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- provider_settings
DROP POLICY IF EXISTS "Users can insert own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can view own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can update own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can delete own provider settings" ON public.provider_settings;
CREATE POLICY "Users can insert own provider settings" ON public.provider_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own provider settings" ON public.provider_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own provider settings" ON public.provider_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own provider settings" ON public.provider_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- recordings
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON public.recordings;
CREATE POLICY "Users can insert own recordings" ON public.recordings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own recordings" ON public.recordings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recordings" ON public.recordings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- referrals
DROP POLICY IF EXISTS "Users can insert own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;
CREATE POLICY "Users can insert own referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);
CREATE POLICY "Users can update own referrals" ON public.referrals FOR UPDATE TO authenticated USING (auth.uid() = referrer_id);

-- rooms
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Shared viewers can view rooms" ON public.rooms;
CREATE POLICY "Users can create rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can view own rooms" ON public.rooms FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can update own rooms" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own rooms" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Shared viewers can view rooms" ON public.rooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM shared_access sa WHERE sa.room_id = rooms.id AND sa.is_active = true AND sa.shared_with_email = (auth.jwt() ->> 'email'::text)));

-- shared_access
DROP POLICY IF EXISTS "Owners can manage shared access" ON public.shared_access;
DROP POLICY IF EXISTS "Viewers can see their access" ON public.shared_access;
CREATE POLICY "Owners can manage shared access" ON public.shared_access FOR ALL TO authenticated USING (auth.uid() = granted_by);
CREATE POLICY "Viewers can see their access" ON public.shared_access FOR SELECT TO authenticated USING (shared_with_email = (auth.jwt() ->> 'email'::text));

-- shared_recordings
DROP POLICY IF EXISTS "Owners can manage shared recordings" ON public.shared_recordings;
DROP POLICY IF EXISTS "Recipients can view shared recordings" ON public.shared_recordings;
CREATE POLICY "Owners can manage shared recordings" ON public.shared_recordings FOR ALL TO authenticated USING (auth.uid() = shared_by);
CREATE POLICY "Recipients can view shared recordings" ON public.shared_recordings FOR SELECT TO authenticated USING (shared_with_email = (auth.jwt() ->> 'email'::text));

-- sleep_events
DROP POLICY IF EXISTS "Users can insert own sleep events" ON public.sleep_events;
DROP POLICY IF EXISTS "Users can view own sleep events" ON public.sleep_events;
DROP POLICY IF EXISTS "Users can delete own sleep events" ON public.sleep_events;
CREATE POLICY "Users can insert own sleep events" ON public.sleep_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own sleep events" ON public.sleep_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sleep events" ON public.sleep_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- subscriptions
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update own subscription" ON public.subscriptions;
CREATE POLICY "System can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can update own subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_camera_settings
DROP POLICY IF EXISTS "Users can insert own camera settings" ON public.user_camera_settings;
DROP POLICY IF EXISTS "Users can view own camera settings" ON public.user_camera_settings;
DROP POLICY IF EXISTS "Users can update own camera settings" ON public.user_camera_settings;
CREATE POLICY "Users can insert own camera settings" ON public.user_camera_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own camera settings" ON public.user_camera_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own camera settings" ON public.user_camera_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- app_settings
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

-- storage.objects - recordings bucket
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own recordings" ON storage.objects;
CREATE POLICY "Users can view own recordings" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own recordings" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);