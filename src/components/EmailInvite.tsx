import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MailCheck, MailX, RefreshCw, Send } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  status: "queued" | "sent" | "delivered" | "opened" | "failed";
  expires_at: string;
  created_at: string;
}

const STATUS_LABEL: Record<Invitation["status"], string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  opened: "Opened",
  failed: "Failed",
};

/** Server-sent email invitations with delivery status and resend. Lives inside the share panel. */
const EmailInvite = ({ roomName }: { roomName: string }) => {
  const { toast } = useToast();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("camera_invitations")
      .select("id, email, status, expires_at, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setInvites(data as Invitation[]);
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  const send = async (resend = false, existingEmail?: string, id?: string) => {
    const target = (existingEmail ?? email).trim();
    if (!target) return;
    if (id) setResendingId(id); else setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: { room_id: roomId, email: target, resend },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.code === "exists") {
          toast({ title: "Already invited", description: "Use the Resend button next to their email below." });
        } else {
          throw new Error(data.error);
        }
      } else {
        toast({
          title: data.status === "sent" ? "Invitation emailed" : "Invitation created",
          description:
            data.status === "sent"
              ? `Sent to ${target}. The link expires in 7 days.`
              : `Saved for ${target}. Email sending switches on once the babycam.io email domain is verified — then tap Resend.`,
        });
        if (!resend) setEmail("");
      }
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't send the invitation", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MailCheck className="h-4 w-4 text-primary" /> Email invitation
      </div>
      <p className="text-xs text-muted-foreground">
        We email a secure link that expires in 7 days — no email app needed on their phone.
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="their@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={() => send()} disabled={sending || !email.trim()} className="shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          Invite
        </Button>
      </div>

      {invites.length > 0 && (
        <ul className="space-y-2 pt-1">
          {invites.map((inv) => {
            const expired = new Date(inv.expires_at) < new Date();
            return (
              <li key={inv.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium">{inv.email}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={
                      inv.status === "failed" || expired
                        ? "flex items-center gap-1 text-destructive"
                        : inv.status === "opened"
                          ? "flex items-center gap-1 text-success"
                          : "text-muted-foreground"
                    }
                  >
                    {(inv.status === "failed" || expired) && <MailX className="h-3.5 w-3.5" />}
                    {expired ? "Expired" : STATUS_LABEL[inv.status]}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={resendingId === inv.id}
                    onClick={() => send(true, inv.email, inv.id)}
                  >
                    {resendingId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                    Resend
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default EmailInvite;
