import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Plus, Copy, Check, Trash2, Loader2, Heart, Mail, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [rooms, setRooms] = useState<any[]>([]);
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
        setRooms(roomsData);
        if (roomsData.length > 0 && !selectedRoom) setSelectedRoom(roomsData[0].id);
      }
      if (sharedData) {
        const enriched = sharedData.map((s: any) => ({
          ...s,
          room_name: roomsData?.find((r: any) => r.id === s.room_id)?.room_name || "Unknown",
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
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("shared_access").insert({
      room_id: selectedRoom,
      shared_with_email: email.trim(),
      access_code: code,
      granted_by: user.id,
    });
    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      const room = rooms.find((r) => r.id === selectedRoom);
      setViewers((prev) => [...prev, {
        id: code, shared_with_email: email, is_active: true, access_code: code,
        room_id: selectedRoom, room_name: room?.room_name || "",
      }]);
      setEmail("");
      toast({ title: "Family member added! 👨‍👩‍👧" });

      // Try to share via native share
      if (navigator.share) {
        try {
          await navigator.share({
            title: "BabyCam.io - You're invited!",
            text: `You've been invited to watch the baby cam! Access code: ${code}. Room: ${room?.room_name}`,
            url: window.location.origin,
          });
        } catch {}
      }
    }
    setAdding(false);
  };

  const removeViewer = async (id: string) => {
    await supabase.from("shared_access").delete().eq("id", id);
    setViewers((prev) => prev.filter((v) => v.id !== id));
    toast({ title: "Access revoked" });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
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
                    Room: {v.room_name?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")} · Code: {v.access_code}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyCode(v.access_code)}>
                    {copiedId === v.access_code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeViewer(v.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
