
-- Fix all 15 anonymous access policy warnings by restricting to authenticated role
-- Drop and recreate all policies with TO authenticated

-- app_settings
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- provider_settings
DROP POLICY IF EXISTS "Users can delete own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can insert own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can update own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can view own provider settings" ON public.provider_settings;
CREATE POLICY "Users can delete own provider settings" ON public.provider_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own provider settings" ON public.provider_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own provider settings" ON public.provider_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own provider settings" ON public.provider_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- recordings
DROP POLICY IF EXISTS "Users can delete own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
CREATE POLICY "Users can delete own recordings" ON public.recordings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recordings" ON public.recordings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own recordings" ON public.recordings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- referrals
DROP POLICY IF EXISTS "Users can insert own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can insert own referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Users can update own referrals" ON public.referrals FOR UPDATE TO authenticated USING (auth.uid() = referrer_id);
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

-- rooms
DROP POLICY IF EXISTS "Shared viewers can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view own rooms" ON public.rooms;
CREATE POLICY "Shared viewers can view rooms" ON public.rooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM shared_access sa WHERE sa.room_id = rooms.id AND sa.is_active = true AND sa.shared_with_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text));
CREATE POLICY "Users can create rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete own rooms" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can update own rooms" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can view own rooms" ON public.rooms FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- shared_access
DROP POLICY IF EXISTS "Owners can manage shared access" ON public.shared_access;
DROP POLICY IF EXISTS "Viewers can see their access" ON public.shared_access;
CREATE POLICY "Owners can manage shared access" ON public.shared_access FOR ALL TO authenticated USING (auth.uid() = granted_by);
CREATE POLICY "Viewers can see their access" ON public.shared_access FOR SELECT TO authenticated USING (shared_with_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text);

-- shared_recordings
DROP POLICY IF EXISTS "Owners can manage shared recordings" ON public.shared_recordings;
DROP POLICY IF EXISTS "Recipients can view shared recordings" ON public.shared_recordings;
CREATE POLICY "Owners can manage shared recordings" ON public.shared_recordings FOR ALL TO authenticated USING (auth.uid() = shared_by);
CREATE POLICY "Recipients can view shared recordings" ON public.shared_recordings FOR SELECT TO authenticated USING (shared_with_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text);

-- sleep_events
DROP POLICY IF EXISTS "Users can delete own sleep events" ON public.sleep_events;
DROP POLICY IF EXISTS "Users can insert own sleep events" ON public.sleep_events;
DROP POLICY IF EXISTS "Users can view own sleep events" ON public.sleep_events;
CREATE POLICY "Users can delete own sleep events" ON public.sleep_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sleep events" ON public.sleep_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own sleep events" ON public.sleep_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- subscriptions
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "System can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update own subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_camera_settings
DROP POLICY IF EXISTS "Users can insert own camera settings" ON public.user_camera_settings;
DROP POLICY IF EXISTS "Users can update own camera settings" ON public.user_camera_settings;
DROP POLICY IF EXISTS "Users can view own camera settings" ON public.user_camera_settings;
CREATE POLICY "Users can insert own camera settings" ON public.user_camera_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own camera settings" ON public.user_camera_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own camera settings" ON public.user_camera_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Storage policies
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload recordings" ON storage.objects;
CREATE POLICY "Users can delete own recordings" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own recordings" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add missing trigger for handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add missing updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_camera_settings_updated_at ON public.user_camera_settings;
CREATE TRIGGER update_user_camera_settings_updated_at BEFORE UPDATE ON public.user_camera_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_settings_updated_at ON public.provider_settings;
CREATE TRIGGER update_provider_settings_updated_at BEFORE UPDATE ON public.provider_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
