
-- Baby care logs (feeding, diaper, temperature)
CREATE TABLE public.baby_care_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_type TEXT NOT NULL DEFAULT 'feeding', -- feeding, diaper, temperature, note
  subtype TEXT, -- breast_left, breast_right, bottle, formula, wet, dirty, mixed
  value TEXT, -- amount in ml/oz, temperature value, or free text note
  duration_minutes INTEGER, -- for feeding duration
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baby_care_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own care logs" ON public.baby_care_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own care logs" ON public.baby_care_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own care logs" ON public.baby_care_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own care logs" ON public.baby_care_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_baby_care_logs_user_date ON public.baby_care_logs (user_id, logged_at DESC);

-- Baby profiles (for milestones + growth tracking per child)
CREATE TABLE public.baby_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT, -- male, female, other
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baby_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own baby profiles" ON public.baby_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own baby profiles" ON public.baby_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own baby profiles" ON public.baby_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own baby profiles" ON public.baby_profiles FOR DELETE USING (auth.uid() = user_id);

-- Growth measurements
CREATE TABLE public.growth_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
  weight_kg REAL,
  height_cm REAL,
  head_cm REAL,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own growth data" ON public.growth_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own growth data" ON public.growth_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own growth data" ON public.growth_measurements FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_growth_user_baby ON public.growth_measurements (user_id, baby_id, measured_at DESC);

-- Milestones tracking
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL, -- first_smile, first_roll, first_crawl, first_steps, first_word, etc.
  achieved_at DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones" ON public.milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own milestones" ON public.milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own milestones" ON public.milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own milestones" ON public.milestones FOR DELETE USING (auth.uid() = user_id);

-- Caregiver temporary access
CREATE TABLE public.caregiver_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  caregiver_email TEXT NOT NULL,
  caregiver_name TEXT,
  access_level TEXT NOT NULL DEFAULT 'view', -- view, view_talk, full
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.caregiver_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage caregiver access" ON public.caregiver_access FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Caregivers can see their access" ON public.caregiver_access FOR SELECT USING (caregiver_email = (auth.jwt() ->> 'email'));
