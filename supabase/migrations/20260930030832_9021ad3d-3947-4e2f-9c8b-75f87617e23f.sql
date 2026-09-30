CREATE TABLE public.sponsor_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  sponsor_name text NOT NULL DEFAULT '',
  click_url text,
  storage_path text NOT NULL,
  resolution text NOT NULL DEFAULT 'auto',
  placement text NOT NULL DEFAULT 'dashboard',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsor_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sponsor_videos TO authenticated;
GRANT ALL ON public.sponsor_videos TO service_role;
ALTER TABLE public.sponsor_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active sponsor videos" ON public.sponsor_videos FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage sponsor videos" ON public.sponsor_videos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Read sponsor video files" ON storage.objects FOR SELECT USING (bucket_id = 'sponsor-videos');
CREATE POLICY "Admins upload sponsor video files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sponsor-videos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete sponsor video files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sponsor-videos' AND public.has_role(auth.uid(),'admin'));