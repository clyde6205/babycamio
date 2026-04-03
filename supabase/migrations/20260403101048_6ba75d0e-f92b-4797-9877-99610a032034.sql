-- Drop the overly permissive SELECT policy on camera_heartbeats
DROP POLICY IF EXISTS "Any authenticated user can read heartbeats" ON public.camera_heartbeats;

-- Replace with a scoped policy: users can read their own heartbeats
-- AND viewers can read heartbeats for rooms they're watching (via rooms table or shared_access)
CREATE POLICY "Users can read own or shared heartbeats" ON public.camera_heartbeats
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR room_name IN (
    SELECT room_name FROM public.rooms WHERE owner_id = auth.uid()
  )
  OR room_name IN (
    SELECT r.room_name FROM public.shared_access sa
    JOIN public.rooms r ON r.id = sa.room_id
    WHERE sa.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND sa.is_active = true
  )
);

-- Also allow anyone (including anonymous viewers) to read heartbeats by room_name
-- since viewers need camera health status and they may not be authenticated
CREATE POLICY "Anyone can read heartbeats by room name" ON public.camera_heartbeats
FOR SELECT TO anon
USING (true);