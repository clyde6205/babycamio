
-- Sleep analytics: store motion events for tracking sleep patterns
CREATE TABLE public.sleep_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'motion', -- motion, cry, quiet
  intensity REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sleep_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sleep events" ON public.sleep_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sleep events" ON public.sleep_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sleep events" ON public.sleep_events FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_sleep_events_user_created ON public.sleep_events (user_id, created_at DESC);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_email TEXT,
  referred_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, rewarded
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can insert own referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Users can update own referrals" ON public.referrals FOR UPDATE USING (auth.uid() = referrer_id);

CREATE INDEX idx_referrals_code ON public.referrals (referral_code);

-- Shared recordings table for family/friends sharing
CREATE TABLE public.shared_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage shared recordings" ON public.shared_recordings FOR ALL USING (auth.uid() = shared_by);
CREATE POLICY "Recipients can view shared recordings" ON public.shared_recordings FOR SELECT USING (
  shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);

CREATE INDEX idx_shared_recordings_token ON public.shared_recordings (access_token);
