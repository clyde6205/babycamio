import { useState } from "react";
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
import { Share2, Loader2, Copy, Check, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadSharedUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shared_access")
      .select("*")
      .eq("room_id", roomId)
      .eq("granted_by", userId)
      .order("created_at", { ascending: false });
    if (data) setSharedUsers(data);
    setLoading(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) loadSharedUsers();
  };

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const shareRoom = async () => {
    if (!email.trim()) return;
    setSharing(true);

    try {
      const code = generateCode();
      const { error } = await supabase.from("shared_access").insert({
        room_id: roomId,
        granted_by: userId,
        shared_with_email: email.trim().toLowerCase(),
        access_code: code,
      });

      if (error) throw error;

      setEmail("");
      await loadSharedUsers();
      toast({
        title: "Access shared",
        description: `${email} can now view this room with code: ${code}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const revokeAccess = async (id: string) => {
    const { error } = await supabase
      .from("shared_access")
      .update({ is_active: false })
      .eq("id", id);
    if (!error) {
      setSharedUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: false } : u))
      );
      toast({ title: "Access revoked" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const friendlyName = roomName.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ");

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">Share "{friendlyName}"</DialogTitle>
          <DialogDescription>
            Invite viewers by email. They'll receive an access code to watch the stream.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new viewer */}
          <div className="space-y-2">
            <Label>Invite Viewer</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="viewer@example.com"
                onKeyDown={(e) => e.key === "Enter" && shareRoom()}
              />
              <Button onClick={shareRoom} disabled={sharing} size="sm">
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Shared users list */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
              Shared With ({sharedUsers.filter((u) => u.is_active).length})
            </Label>
            {loading ? (
              <div className="py-4 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sharedUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No viewers shared yet
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sharedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-sm ${
                      !user.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{user.shared_with_email}</p>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs text-muted-foreground">
                          {user.access_code}
                        </code>
                        <button onClick={() => copyCode(user.access_code)}>
                          {copiedCode === user.access_code ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    {user.is_active ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => revokeAccess(user.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Revoked</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share link info */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Viewers must sign up with the invited email address and navigate to{" "}
              <code className="text-foreground">/viewer/{roomName}</code> to watch.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
