import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  room_id: z.string().uuid(),
  email: z.string().email().max(320),
  resend: z.boolean().optional(),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Invitation service is not configured" }, 503);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "A valid room and email address are required" }, 400);
    const { room_id, email, resend } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, room_name, owner_id")
      .eq("id", room_id)
      .single();
    if (roomError || !room || room.owner_id !== userId) {
      return json({ error: "Camera not found or not yours" }, 403);
    }

    const { data: existing } = await supabase
      .from("camera_invitations")
      .select("id, token, status")
      .eq("room_id", room_id)
      .eq("email", cleanEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let invitationId: string;
    let inviteToken: string;

    if (existing && !resend) {
      return json({ error: "This email already has an invitation — use Resend instead", code: "exists" }, 409);
    }

    if (existing && resend) {
      const { data: updated, error: updateError } = await supabase
        .from("camera_invitations")
        .update({
          token: crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "").slice(0, 16),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "queued",
          sent_at: null,
          opened_at: null,
        })
        .eq("id", existing.id)
        .select("id, token")
        .single();
      if (updateError || !updated) return json({ error: "Could not resend the invitation" }, 500);
      invitationId = updated.id;
      inviteToken = updated.token;
    } else {
      const { data: created, error: insertError } = await supabase
        .from("camera_invitations")
        .insert({ room_id, owner_id: userId, email: cleanEmail })
        .select("id, token")
        .single();
      if (insertError || !created) return json({ error: "Could not create the invitation" }, 500);
      invitationId = created.id;
      inviteToken = created.token;
    }

    const inviteUrl = `https://babycam.io/invite-camera/${inviteToken}`;
    const emailApiUrl = Deno.env.get("EMAIL_QUEUE_URL");
    const emailApiKey = Deno.env.get("EMAIL_QUEUE_KEY");
    let status = "queued";

    if (emailApiUrl && emailApiKey) {
      try {
        const safeRoomName = escapeHtml(room.room_name.replace(/-[a-z0-9]+$/i, "").replace(/-/g, " "));
        const sendResponse = await fetch(emailApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${emailApiKey}` },
          body: JSON.stringify({
            to: cleanEmail,
            subject: `Watch "${safeRoomName}" live on BabyCam.io`,
            html: invitationEmail(safeRoomName, inviteUrl),
          }),
        });
        status = sendResponse.ok ? "sent" : "failed";
      } catch {
        status = "failed";
      }

      await supabase
        .from("camera_invitations")
        .update({ status, sent_at: status === "sent" ? new Date().toISOString() : null })
        .eq("id", invitationId);
    }

    return json({ id: invitationId, status, inviteUrl, emailConfigured: Boolean(emailApiUrl) });
  } catch (error) {
    console.error("[SendInvitation] Error:", error);
    return json({ error: "An error occurred processing your request" }, 500);
  }
});

function invitationEmail(roomName: string, inviteUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b1526;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#101f38;border:1px solid #1e3a5f;border-radius:16px;padding:32px;text-align:center;">
      <div style="font-size:24px;font-weight:700;color:#22d3ee;letter-spacing:0.5px;">BabyCam.io</div>
      <p style="color:#e2e8f0;font-size:17px;line-height:1.5;margin:24px 0 8px;">
        You've been invited to watch <strong style="color:#ffffff;">${roomName}</strong> live.
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
        Tap the button below — the live view opens instantly in the browser. No app or account needed.
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:#22d3ee;color:#0b1526;font-weight:700;font-size:16px;text-decoration:none;padding:14px 36px;border-radius:12px;">
        Watch live now
      </a>
      <p style="color:#64748b;font-size:12px;margin:28px 0 0;">
        This link is personal to you and expires in 7 days.<br/>
        If the button doesn't work, copy this link:<br/>
        <span style="color:#22d3ee;word-break:break-all;">${inviteUrl}</span>
      </p>
    </div>
    <p style="color:#475569;font-size:11px;text-align:center;margin-top:16px;">Sent with BabyCam.io — simple, secure baby monitoring.</p>
  </div>
</body></html>`;
}
