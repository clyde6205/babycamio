import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Plus, Copy, Check, Trash2, Loader2, Heart, Mail, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { viewerLink } from "@/lib/share";

interface RoomOption {
  id: string;
  room_name: string;
}

interface SharedViewer {
  id: string;
  shared_with_email: string;
  is_active: boolean;
  access_code: string;
  room_id: string;
  room_name?: string;
}

const FamilyCircle = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAutoAuth();
  const [viewers, setViewers] = useState<SharedViewer[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      const [{ data: roomsData }, { data: sharedData }] = await Promise.all([
        supabase.from("rooms").select("*").eq("owner_id", user.id),
        supabase.from("shared_access").select("*").eq("granted_by", user.id),
      ]);
      if (roomsData) {
        setRooms(roomsData as RoomOption[]);
        if (roomsData.length > 0) setSelectedRoom((current) => current || roomsData[0].id);
      }
      if (sharedData) {
        const enriched = sharedData.map((share) => ({
          ...share,
          room_name: roomsData?.find((room) => room.id === share.room_id)?.room_name || "Unknown",
        }));
        setViewers(enriched);
      }
      setLoading(false);
    };
    load();
  }, [user, authLoading]);

  const addViewer = async () => {
    if (!email.trim() || !selectedRoom || !user) return;
    setAdding(true);
    const normalizedEmail = email.trim().toLowerCase();
    const shareToken = crypto.randomUUID();
    const privateLink = viewerLink(shareToken);
    const { data: created, error } = await supabase.from("shared_access").insert({
      room_id: selectedRoom,
      shared_with_email: normalizedEmail,
      access_code: shareToken,
      granted_by: user.id,
    }).select("id, room_id, shared_with_email, is_active, access_code").single();

    if (error || !created) {
      toast({ title: "Failed to add", description: error?.message || "Could not create a private viewer link.", variant: "destructive" });
    } else {
      const room = rooms.find((r) => r.id === selectedRoom);
      setViewers((prev) => [...prev, { ...created, room_name: room?.room_name || "" }]);
      setEmail("");
      toast({ title: "Private viewer link created", description: "Share the link with " + normalizedEmail + ". You can revoke it at any time." });

      if (navigator.share) {
        try {
          await navigator.share({
            title: "BabyCam.io - Private viewer invitation",
            text: "You've been invited to watch " + (room?.room_name || "this camera") + " on BabyCam.io. This private link can be revoked by the camera owner.",
            url: privateLink,
          });
        } catch {
          // The private link remains available from the Copy link control.
        }
      }
    }
    setAdding(false);
  };

  const removeViewer = async (id: string) => {
    const { error } = await supabase.from("shared_access")
      .update({ is_active: false })
      .eq("id", id)
      .eq("granted_by", user?.id || "");
    if (error) {
      toast({ title: "Could not revoke access", description: error.message, variant: "destructive" });
      return;
    }
    setViewers((prev) => prev.map((viewer) => viewer.id === id ? { ...viewer, is_active: false } : viewer));
    toast({ title: "Access revoked" });
  };

  const copyViewerLink = async (viewer: SharedViewer) => {
    try {
      await navigator.clipboard.writeText(viewerLink(viewer.access_code));
      setCopiedId(viewer.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Copy unavailable", description: "Clipboard access is unavailable on this device.", variant: "destructive" });
    }
  };

  const FAMILY_ROLES = ["👵 Grandma", "👴 Grandpa", "👩 Aunt", "👨 Uncle", "🧑‍🍼 Nanny", "👫 Friend"];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="touch-target"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-red-400" /> Family Circle</h1>
        <span className="ml-auto text-sm text-muted-foreground">{viewers.length} members</span>
      </header>

      <div className="p-4 space-y-4">
        {/* Add Member */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Invite Family Member
          </h3>
          <div className="space-y-3">
            {rooms.length > 0 && (
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_name.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="grandma@email.com" type="email" className="flex-1" />
              <Button onClick={addViewer} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {FAMILY_ROLES.map((role) => (
                <span key={role} className="text-xs rounded-full bg-muted px-2.5 py-1">{role}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Members List */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : viewers.length === 0 ? (
          <div className="text-center py-10">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold">No family members yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Invite grandparents, aunts, uncles, or friends to watch your baby</p>
          </div>
        ) : (
          viewers.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {v.shared_with_email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Room: {v.room_name?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")} · {v.is_active ? "Private link active" : "Access revoked"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {v.is_active && (
                    <>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void copyViewerLink(v)} aria-label="Copy private viewer link">
                        {copiedId === v.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => void removeViewer(v.id)} aria-label="Revoke viewer access">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default FamilyCircle;
