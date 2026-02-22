
-- Camera heartbeat tracking for health monitoring
CREATE TABLE public.camera_heartbeats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy', -- healthy, degraded, disconnected
  battery_level NUMERIC,
  network_type TEXT,
  network_quality TEXT,
  stream_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, room_name)
);

-- Enable RLS
ALTER TABLE public.camera_heartbeats ENABLE ROW LEVEL SECURITY;

-- Users can manage their own heartbeats
CREATE POLICY "Users can upsert own heartbeats"
ON public.camera_heartbeats FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Viewers can read heartbeats for rooms they have access to
CREATE POLICY "Viewers can read heartbeats via shared access"
ON public.camera_heartbeats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_access sa
    JOIN public.rooms r ON r.id = sa.room_id
    WHERE r.room_name = camera_heartbeats.room_name
    AND sa.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.room_name = camera_heartbeats.room_name
    AND r.owner_id = auth.uid()
  )
);

-- Enable realtime for heartbeats
ALTER PUBLICATION supabase_realtime ADD TABLE public.camera_heartbeats;

-- Trigger for updated_at
CREATE TRIGGER update_camera_heartbeats_updated_at
BEFORE UPDATE ON public.camera_heartbeats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
