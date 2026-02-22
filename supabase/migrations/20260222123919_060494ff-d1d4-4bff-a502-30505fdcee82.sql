
-- Add room_id to link external cameras to the rooms system for sharing/grid
ALTER TABLE public.external_cameras
  ADD COLUMN room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- Index for quick lookups
CREATE INDEX idx_external_cameras_room_id ON public.external_cameras(room_id);
CREATE INDEX idx_external_cameras_user_id ON public.external_cameras(user_id);
