-- Secure camera-room privacy boundaries and UUID-based viewer access.
-- This migration intentionally replaces broad historical policies with owner-scoped access.

-- Rooms: owners manage their rooms; authenticated shared users can only read rooms shared with them.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rooms', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Room owners manage their rooms"
ON public.rooms
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Shared users can read shared rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shared_access sa
    WHERE sa.room_id = rooms.id
      AND sa.is_active = true
      AND lower(sa.shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- Camera heartbeats contain camera availability, network and battery metadata.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'camera_heartbeats'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.camera_heartbeats', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Camera owners manage their heartbeats"
ON public.camera_heartbeats
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Private recordings belong only to the camera owner.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.recordings', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Owners manage their recordings"
ON public.recordings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Baby sleep/cry analytics are private account data.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sleep_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sleep_events', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Owners manage their sleep events"
ON public.sleep_events
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Per-user camera preferences stay private.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_camera_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_camera_settings', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users manage their camera settings"
ON public.user_camera_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Profiles are account metadata and should not be world-readable.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Invitations are validated through the RPC below rather than public table reads.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'camera_invitations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.camera_invitations', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Owners manage camera invitations"
ON public.camera_invitations
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Shared-access records are manageable only by the room owner/grantor.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shared_access'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_access', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Grantors manage shared access"
ON public.shared_access
FOR ALL
TO authenticated
USING (granted_by = auth.uid())
WITH CHECK (granted_by = auth.uid());

-- Health status for a private viewer link. The UUID is the capability and this function
-- exposes only operational status, not stream credentials or room ownership data.
CREATE OR REPLACE FUNCTION public.get_camera_health(_room_id uuid)
RETURNS TABLE (
  status text,
  battery_level integer,
  network_quality text,
  last_heartbeat timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ch.status,
    ch.battery_level,
    ch.network_quality,
    ch.last_heartbeat
  FROM public.rooms r
  JOIN public.camera_heartbeats ch
    ON ch.room_name = r.room_name
   AND ch.user_id = r.owner_id
  WHERE r.id = _room_id
  ORDER BY ch.last_heartbeat DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_camera_health(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_camera_health(uuid) TO anon, authenticated;

-- Return the room UUID so invitation flows can route through private viewer URLs.
DROP FUNCTION IF EXISTS public.validate_invitation(text);

CREATE FUNCTION public.validate_invitation(_token text)
RETURNS TABLE (
  expired boolean,
  opened_at timestamptz,
  room_id uuid,
  room_name text,
  room_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  SELECT
    ci.id,
    ci.expires_at,
    ci.opened_at,
    r.id AS room_id,
    r.room_name,
    r.room_type
  INTO invitation_record
  FROM public.camera_invitations ci
  JOIN public.rooms r ON r.id = ci.room_id
  WHERE ci.token = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.camera_invitations
  SET opened_at = COALESCE(opened_at, now())
  WHERE id = invitation_record.id;

  RETURN QUERY
  SELECT
    invitation_record.expires_at <= now(),
    COALESCE(invitation_record.opened_at, now()),
    invitation_record.room_id,
    invitation_record.room_name,
    invitation_record.room_type;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invitation(text) TO anon, authenticated;
