import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Baby, Video, AlertTriangle, Loader2 } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "valid"; roomName: string }
  | { kind: "expired" }
  | { kind: "invalid" };

/** Public landing page for emailed camera invitations: /invite-camera/:token */
const InviteCamera = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) { setState({ kind: "invalid" }); return; }
    (async () => {
      const { data, error } = await supabase.rpc("validate_invitation", { _token: token });
      if (error || !data || data.length === 0) { setState({ kind: "invalid" }); return; }
      const row = data[0] as { room_name: string; expired: boolean };
      if (row.expired) { setState({ kind: "expired" }); return; }
      setState({ kind: "valid", roomName: row.room_name });
    })();
  }, [token]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex items-center gap-2 text-primary">
        <Baby className="h-8 w-8" />
        <span className="text-2xl font-bold">BabyCam.io</span>
      </div>

      {state.kind === "loading" && (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Checking your invitation…
        </div>
      )}

      {state.kind === "valid" && (
        <div className="mt-10 w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8">
          <Video className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-xl font-bold capitalize">You're invited to watch “{state.roomName}”</h1>
          <p className="text-sm text-muted-foreground">
            Tap below — the live view opens instantly in your browser. No app or account needed.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to={`/viewer/${encodeURIComponent(state.roomName)}`}>Watch live now</Link>
          </Button>
        </div>
      )}

      {state.kind === "expired" && (
        <div className="mt-10 w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold">This invitation has expired</h1>
          <p className="text-sm text-muted-foreground">
            Invitation links stay valid for 7 days. Ask the camera owner to send you a new invitation from their BabyCam.io app.
          </p>
        </div>
      )}

      {state.kind === "invalid" && (
        <div className="mt-10 w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold">Invitation not found</h1>
          <p className="text-sm text-muted-foreground">
            This link doesn't match any invitation. Check that you copied the whole link, or ask the camera owner to resend it.
          </p>
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">Simple, secure baby monitoring — babycam.io</p>
    </div>
  );
};

export default InviteCamera;
