
-- Drop all existing restrictive policies on rooms
DROP POLICY IF EXISTS "Shared viewers can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view own rooms" ON public.rooms;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can view own rooms"
ON public.rooms FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Shared viewers can view rooms"
ON public.rooms FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM shared_access sa
  WHERE sa.room_id = rooms.id
    AND sa.is_active = true
    AND sa.shared_with_email = (auth.jwt() ->> 'email'::text)
));

CREATE POLICY "Users can create rooms"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own rooms"
ON public.rooms FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own rooms"
ON public.rooms FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);
