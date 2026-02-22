-- Allow any authenticated user to read camera heartbeats (for worldwide viewing)
DROP POLICY IF EXISTS "Viewers can read heartbeats via shared access" ON public.camera_heartbeats;

CREATE POLICY "Any authenticated user can read heartbeats"
ON public.camera_heartbeats
FOR SELECT
TO authenticated
USING (true);