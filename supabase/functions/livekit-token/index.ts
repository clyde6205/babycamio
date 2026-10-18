import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_TTL_SECONDS = 2 * 60 * 60;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const base64UrlText = (value: string) => base64Url(new TextEncoder().encode(value));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const roomKey = cleanText(body.roomName, 200);
    const participantName = cleanText(body.participantName, 80) || "Viewer";
    const isPublisher = body.isPublisher === true;

    if (!roomKey) return json({ error: "A room identifier is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return json({ error: "Token service is not configured" }, 503);

    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        userEmail = user.email?.toLowerCase() ?? null;
      }
    }

    let room: { id: string; room_name: string; owner_id: string } | null = null;

    if (isPublisher) {
      // Publishers use the stable LiveKit room slug and must own that room.
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_name, owner_id")
        .eq("room_name", roomKey)
        .maybeSingle();
      if (error || !data) return json({ error: "Camera room not found" }, 404);
      if (!userId || data.owner_id !== userId) {
        return json({ error: "Only the room owner can broadcast" }, 403);
      }
      room = data;
    } else if (UUID_PATTERN.test(roomKey)) {
      // Public share URLs use the room UUID as an unguessable bearer key. The
      // LiveKit room slug is never exposed or accepted for anonymous viewing.
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_name, owner_id")
        .eq("id", roomKey)
        .maybeSingle();
      if (error || !data) return json({ error: "Viewer link is invalid" }, 404);
      room = data;
    } else if (userId) {
      // Signed-in owners and explicitly shared users may still open the older
      // slug-based URL from inside the app.
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_name, owner_id")
        .eq("room_name", roomKey)
        .maybeSingle();
      if (error || !data) return json({ error: "Camera room not found" }, 404);

      const isOwner = data.owner_id === userId;
      const { data: sharedAccess } = userEmail
        ? await supabase
            .from("shared_access")
            .select("id")
            .eq("room_id", data.id)
            .eq("shared_with_email", userEmail)
            .eq("is_active", true)
            .limit(1)
        : { data: null };

      if (!isOwner && !sharedAccess?.length) {
        return json({ error: "You do not have access to this camera" }, 403);
      }
      room = data;
    } else {
      return json({ error: "Use a current viewer link from the camera owner" }, 403);
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");
    if (!apiKey || !apiSecret || !livekitUrl) {
      return json({
        error: "LiveKit is not configured",
        message: "Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL as function secrets.",
      }, 503);
    }

    const header = base64UrlText(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const identity = userId ?? `viewer-${crypto.randomUUID()}`;
    const payload = {
      iss: apiKey,
      sub: identity,
      name: participantName,
      nbf: now - 5,
      exp: now + TOKEN_TTL_SECONDS,
      jti: crypto.randomUUID(),
      video: {
        room: room.room_name,
        roomJoin: true,
        canPublish: isPublisher,
        canSubscribe: true,
        canPublishData: true,
        ...(isPublisher ? {} : { canPublishSources: ["microphone"] }),
      },
    };

    const payloadB64 = base64UrlText(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${header}.${payloadB64}`),
    );

    return json({
      token: `${header}.${payloadB64}.${base64Url(new Uint8Array(signature))}`,
      url: livekitUrl,
      roomName: room.room_name,
      roomId: room.id,
      expiresIn: TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error("[LiveKitToken] Error:", err);
    return json({ error: "Unable to create a stream token" }, 500);
  }
});
