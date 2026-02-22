import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
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

    // Generate a JWT token for LiveKit
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const now = Math.floor(Date.now() / 1000);
    const participantId = crypto.randomUUID();
    const payload = {
      iss: apiKey,
      sub: participantId,
      name: participantName,
      nbf: now,
      exp: now + 86400,
      jti: crypto.randomUUID(),
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: isPublisher === true,
        canSubscribe: true,
        canPublishData: true,
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
