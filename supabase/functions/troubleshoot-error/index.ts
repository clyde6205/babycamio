import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createResponsesCall } from "../_shared/responses.ts";

const cors = { ...corsHeaders, "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `You are BabyCam.io's support engineer. BabyCam.io is an Android baby-monitor app: a parent's phone acts as a camera, and receivers open a link like https://babycam.io/viewer/ROOM in their phone browser (often from WhatsApp, Messenger, Facebook, SMS, Telegram or a QR scan) to watch live video over LiveKit (WebRTC). Receivers need no app or account.
The camera owner pastes an error a receiver saw. Explain in plain, friendly language for a non-technical parent:
1. "Likely cause" — 1-3 sentences.
2. "Try these steps" — a short numbered list, most likely fix first, tailored to the context given (e.g. in-app browsers from WhatsApp/Facebook blocking camera/mic or WebRTC -> open in Chrome; camera phone asleep or app closed; old babycam.lovable.app links -> resend a new link; poor Wi-Fi; browser too old; camera stopped).
3. "If it still fails" — one line.
Use short markdown headings. Under 250 words. Never invent features. Never mention Lovable.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in first." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Please sign in first." }, 401);

    const body = await req.json().catch(() => ({}));
    const error = String(body.error || "").trim().slice(0, 6000);
    const context = String(body.context || "").trim().slice(0, 500);
    if (error.length < 3) return json({ error: "Please paste the error message." }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    const call = createResponsesCall(
      req,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `How the receiver opened the link / device: ${context || "unknown"}\n\nError text:\n${error}` },
      ],
    );
    try {
      const text = await call.result.text;
      if (!text.trim()) return json({ error: "The AI couldn't produce an answer for this error." }, 502);
      return json({ answer: text });
    } catch (e: unknown) {
      const record = e && typeof e === "object" ? e as Record<string, unknown> : {};
      const nested = record.lastError && typeof record.lastError === "object"
        ? record.lastError as Record<string, unknown>
        : {};
      const statusValue = record.statusCode ?? nested.statusCode;
      const status = typeof statusValue === "number" ? statusValue : 500;
      if (status === 429) return json({ error: "Too many requests right now. Please wait a minute and try again." }, 429);
      if (status === 402) return json({ error: "AI credits have run out. Add credits in workspace billing to keep using this." }, 402);
      if (status === 403) return json({ error: "AI access is blocked for this workspace." }, 403);
      console.error("gateway error", status, record.message);
      return json({ error: "The AI service had a problem. Please try again shortly." }, status >= 500 ? 502 : status);
    }
  } catch (e: unknown) {
    if (req.signal.aborted) return new Response(null, { status: 499, headers: cors });
    console.error(e);
    return json({ error: "Something went wrong." }, 500);
  }
});
