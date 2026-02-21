
-- Table to securely store payment provider API keys
-- Only the owner (first admin user) can read/write their keys
CREATE TABLE public.provider_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  key_name text NOT NULL,
  key_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, key_name)
);

-- Enable RLS
ALTER TABLE public.provider_settings ENABLE ROW LEVEL SECURITY;

-- Only the key owner can view their own keys
CREATE POLICY "Users can view own provider settings"
ON public.provider_settings FOR SELECT
USING (auth.uid() = user_id);

-- Only the key owner can insert their own keys
CREATE POLICY "Users can insert own provider settings"
ON public.provider_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only the key owner can update their own keys
CREATE POLICY "Users can update own provider settings"
ON public.provider_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Only the key owner can delete their own keys
CREATE POLICY "Users can delete own provider settings"
ON public.provider_settings FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_provider_settings_updated_at
BEFORE UPDATE ON public.provider_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
