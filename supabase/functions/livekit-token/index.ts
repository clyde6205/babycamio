import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { roomName, participantName, isPublisher } = await req.json();

    if (!roomName || !participantName) {
      return new Response(JSON.stringify({ error: "roomName and participantName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Authentication: optional for viewers, required for publishers ---
    let userId = "anonymous-" + crypto.randomUUID().substring(0, 8);
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Publishers MUST be authenticated and own the room
    if (isPublisher === true) {
      if (userId.startsWith("anonymous-")) {
        return new Response(JSON.stringify({ error: "Authentication required to broadcast" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: room } = await supabase
        .from("rooms")
        .select("owner_id")
        .eq("room_name", roomName)
        .maybeSingle();

      if (room && room.owner_id !== userId) {
        return new Response(JSON.stringify({ error: "Only the room owner can broadcast" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Viewers: NO restrictions — anyone can watch from anywhere in the world

    // --- Generate LiveKit JWT ---
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey || !apiSecret || !livekitUrl) {
      return new Response(
        JSON.stringify({
          error: "LiveKit not configured",
          message: "LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL must be set as secrets.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: apiKey,
      sub: userId,
      name: participantName,
      nbf: now,
      exp: now + 86400,
      jti: crypto.randomUUID(),
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: isPublisher === true,
        canSubscribe: true,
        canPublishData: isPublisher === true,
      },
    };

    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${payloadB64}`));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const livekitToken = `${header}.${payloadB64}.${sigB64}`;

    console.log(`[LiveKitToken] ✅ Token generated for ${isPublisher ? "publisher" : "viewer"} "${participantName}" in room "${roomName}" (user: ${userId.substring(0, 8)}…)`);

    return new Response(
      JSON.stringify({ token: livekitToken, url: livekitUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[LiveKitToken] Error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
