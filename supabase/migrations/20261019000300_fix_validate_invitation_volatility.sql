-- validate_invitation records first-open time, so it must be VOLATILE rather than STABLE.

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
    invitation_record.room_id,
    invitation_record.room_name,
    invitation_record.room_type;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invitation(text) TO anon, authenticated;
