
-- Drop ALL existing policies on rooms
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'rooms' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rooms', pol.policyname);
  END LOOP;
END $$;

-- Recreate as PERMISSIVE (default) policies
CREATE POLICY "Anyone authenticated can view own rooms"
ON public.rooms
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Shared viewers can view rooms"
ON public.rooms
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM shared_access sa
  WHERE sa.room_id = rooms.id
    AND sa.is_active = true
    AND sa.shared_with_email = (auth.jwt() ->> 'email'::text)
));

CREATE POLICY "Anyone authenticated can create rooms"
ON public.rooms
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own rooms"
ON public.rooms
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own rooms"
ON public.rooms
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);
