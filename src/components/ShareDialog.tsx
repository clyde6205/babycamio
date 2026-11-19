import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Copy, Loader2, Share2, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { viewerLink } from "@/lib/share";

interface SharedUser {
  id: string;
  shared_with_email: string;
  access_code: string;
  is_active: boolean;
  created_at: string;
}

interface ShareDialogProps {
  roomId: string;
  roomName: string;
  userId: string;
}

const ShareDialog = ({ roomId, roomName, userId }: ShareDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const friendlyName = roomName.replace(/-[a-z0-9]+$/i, "").replace(/-/g, " ") || roomName;

  const loadSharedUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shared_access")
      .select("id, shared_with_email, access_code, is_active, created_at")
      .eq("room_id", roomId)
      .eq("granted_by", userId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setSharedUsers((data || []) as SharedUser[]);
    }
    setLoading(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) void loadSharedUsers();
  };

  const shareRoom = async () => {
    const to = email.trim().toLowerCase();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast({ title: "Valid email required", description: "Enter the viewer's email address.", variant: "destructive" });
      return;
    }
    setSharing(true);
    try {
      const shareToken = crypto.randomUUID();
      const privateLink = viewerLink(shareToken);
      const { error } = await supabase.from("shared_access").insert({
        room_id: roomId,
        granted_by: userId,
        shared_with_email: to,
        access_code: shareToken,
      });
      if (error) throw error;

      const mail = document.createElement("a");
      mail.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Watch "${friendlyName}" live on BabyCam.io`)}&body=${encodeURIComponent(`Hi!\n\nYou've been invited to watch my baby camera "${friendlyName}" live.\n\nOpen this private link (no download or account needed):\n${privateLink}\n\nKeep this link private.\n\nSent with BabyCam.io`)}`;
      document.body.appendChild(mail);
      mail.click();
      mail.remove();
      setEmail("");
      await loadSharedUsers();
      toast({ title: t("share.accessShared"), description: `A revocable private viewer link was prepared for ${to}.` });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  const revokeAccess = async (id: string) => {
    const { error } = await supabase
      .from("shared_access")
      .update({ is_active: false })
      .eq("id", id)
      .eq("granted_by", userId)
      .eq("room_id", roomId);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    setSharedUsers((prev) => prev.map((viewer) => viewer.id === id ? { ...viewer, is_active: false } : viewer));
    toast({ title: t("share.accessRevoked"), description: "New viewing sessions using this link are blocked." });
  };

  const copyViewerLink = async (viewer: SharedUser) => {
    try {
      await navigator.clipboard.writeText(viewerLink(viewer.access_code));
      setCopiedLink(viewer.id);
      window.setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast({ title: t("common.error"), description: "Clipboard access is unavailable on this device.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Share room">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{t("share.shareRoom", { name: friendlyName })}</DialogTitle>
          <DialogDescription>{t("share.inviteDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("share.inviteViewer")}</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("share.emailPlaceholder")}
                onKeyDown={(event) => event.key === "Enter" && void shareRoom()}
              />
              <Button onClick={shareRoom} disabled={sharing} size="sm" className="h-11 w-11">
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("share.sharedWith", { count: sharedUsers.filter((viewer) => viewer.is_active).length })}
            </Label>
            {loading ? (
              <div className="py-4 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sharedUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("share.noViewers")}</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {sharedUsers.map((viewer) => (
                  <div key={viewer.id} className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm ${!viewer.is_active ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{viewer.shared_with_email === "link-access@babycam.io" ? "Anyone with this link" : viewer.shared_with_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {viewer.is_active ? "Private link active" : "Access revoked"}
                      </p>
                    </div>
                    {viewer.is_active ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => void copyViewerLink(viewer)}>
                          {copiedLink === viewer.id ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                          Copy link
                        </Button>
                        <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive" onClick={() => void revokeAccess(viewer.id)} aria-label="Revoke access">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("share.revoked")}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
