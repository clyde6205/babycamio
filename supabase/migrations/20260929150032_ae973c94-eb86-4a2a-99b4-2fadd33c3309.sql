DROP POLICY IF EXISTS "System can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
('ads', '{"enabled":true,"banner_enabled":true,"interstitial_enabled":false,"test_mode":true,"banner_unit_id":"ca-app-pub-3940256099942544/6300978111","interstitial_unit_id":"ca-app-pub-3940256099942544/1033173712","interstitial_every_n_views":5,"banner_position":"bottom"}'::jsonb),
('app_config', '{"maintenance_mode":false,"maintenance_message":"BabyCam.io is getting an upgrade. Back shortly.","announcement":"","announcement_level":"info","signups_enabled":true,"free_max_cameras":1,"pro_max_cameras":10,"min_app_version":""}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;