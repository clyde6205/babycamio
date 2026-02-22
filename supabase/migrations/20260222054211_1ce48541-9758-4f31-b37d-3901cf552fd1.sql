
-- Drop existing permissive user-level policies on provider_settings
DROP POLICY IF EXISTS "Users can delete own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can insert own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can update own provider settings" ON public.provider_settings;
DROP POLICY IF EXISTS "Users can view own provider settings" ON public.provider_settings;

-- Create admin-only policies
CREATE POLICY "Admins can manage provider settings"
ON public.provider_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
