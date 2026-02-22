
-- Table for storing external camera connections (CCTV, IP cameras)
CREATE TABLE public.external_cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'mjpeg',
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add check for protocol values
ALTER TABLE public.external_cameras
  ADD CONSTRAINT external_cameras_protocol_check
  CHECK (protocol IN ('mjpeg', 'hls', 'http', 'rtsp'));

-- Enable RLS
ALTER TABLE public.external_cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own external cameras"
  ON public.external_cameras FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own external cameras"
  ON public.external_cameras FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own external cameras"
  ON public.external_cameras FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own external cameras"
  ON public.external_cameras FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_external_cameras_updated_at
  BEFORE UPDATE ON public.external_cameras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
