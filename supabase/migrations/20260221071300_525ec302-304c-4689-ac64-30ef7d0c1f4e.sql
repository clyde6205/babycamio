
-- Global app settings table (admin-controlled defaults)
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage app settings"
ON public.app_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default motion settings
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
('motion_recording', '{"default_duration_minutes": 5, "max_duration_minutes": 60, "min_duration_minutes": 1, "motion_sensitivity": 25, "motion_min_percent": 1.5, "cooldown_seconds": 3}'::jsonb);

-- User-level camera preferences table
CREATE TABLE public.user_camera_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recording_duration_minutes integer NOT NULL DEFAULT 5,
  motion_enabled boolean NOT NULL DEFAULT true,
  motion_sensitivity integer NOT NULL DEFAULT 25,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_camera_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own camera settings"
ON public.user_camera_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own camera settings"
ON public.user_camera_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own camera settings"
ON public.user_camera_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_camera_settings_updated_at
BEFORE UPDATE ON public.user_camera_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
