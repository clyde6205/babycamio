-- Follow-up hardening for review findings on private room sharing.
-- This migration is additive and safe to apply after the 20261019 security migrations.

-- A grantor may only manage shares for rooms they own. Recipients may read only
-- their own active grant so the room RLS policy can evaluate membership.
-- Use a SECURITY DEFINER predicate to avoid recursive RLS evaluation:
-- rooms policies inspect shared_access, so shared_access policies must not query rooms directly.
CREATE OR REPLACE FUNCTION public.is_room_owner(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id AND r.owner_id = auth.uid()
  );
$;

REVOKE ALL ON FUNCTION public.is_room_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "Grantors manage shared access" ON public.shared_access;
DROP POLICY IF EXISTS "Recipients read their active shared access" ON public.shared_access;

CREATE POLICY "Room owners manage shared access"
ON public.shared_access
FOR ALL
TO authenticated
USING (
  granted_by = auth.uid()
  AND public.is_room_owner(shared_access.room_id)
)
WITH CHECK (
  granted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = shared_access.room_id AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Recipients read their active shared access"
ON public.shared_access
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND lower(shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Invitation grants are also restricted to rooms owned by the inviter.
DROP POLICY IF EXISTS "Owners manage camera invitations" ON public.camera_invitations;
CREATE POLICY "Owners manage invitations for their rooms"
ON public.camera_invitations
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid()
  AND public.is_room_owner(camera_invitations.room_id)
)
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = camera_invitations.room_id AND r.owner_id = auth.uid()
  )
);

-- The room UUID is a viewer capability in the current implementation. Never
-- return it from an expired invitation, otherwise the invitation expiry is bypassed.
CREATE OR REPLACE FUNCTION public.validate_invitation(_token text)
RETURNS TABLE (
  expired boolean,
  opened_at timestamptz,
  room_id uuid,
  room_name text,
  room_type text
)
LANGUAGE plpgsql
VOLATILE
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
    CASE WHEN invitation_record.expires_at > now() THEN invitation_record.room_id ELSE NULL::uuid END,
    CASE WHEN invitation_record.expires_at > now() THEN invitation_record.room_name ELSE NULL::text END,
    CASE WHEN invitation_record.expires_at > now() THEN invitation_record.room_type ELSE NULL::text END;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invitation(text) TO anon, authenticated;
