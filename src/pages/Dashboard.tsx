import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Video, Plus, Camera, Eye, LogOut, Loader2, Trash2, Copy, Check, Crown, Settings } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Room {
  id: string;
  room_name: string;
  is_active: boolean;
  room_type: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { isPro } = useSubscription();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      await fetchRooms();
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setRooms(data);
    setLoading(false);
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    setCreating(true);
    const roomSlug = newRoomName.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    
    const { error } = await supabase.from("rooms").insert({
      room_name: roomSlug,
      owner_id: user!.id,
      room_type: "baby",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewRoomName("");
      setShowCreate(false);
      await fetchRooms();
      toast({ title: "Room created", description: `"${newRoomName}" is ready to use.` });
    }
    setCreating(false);
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (!error) {
      setRooms((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Room deleted" });
    }
  };

  const copyRoomCode = (roomName: string) => {
    navigator.clipboard.writeText(roomName);
    setCopiedId(roomName);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Room code copied", description: "Share this with viewers." });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-primary">Cam</span>.io
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isPro && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="touch-target text-yellow-500">
              <Crown className="h-4 w-4 mr-1" /> Upgrade
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="touch-target" title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="touch-target">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Rooms</h1>
            <p className="text-sm text-muted-foreground">Manage your monitoring cameras</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
            className="touch-target"
          >
            <Plus className="mr-1 h-4 w-4" /> New Room
          </Button>
        </div>

        {/* Create room form */}
        {showCreate && (
          <Card className="mb-6 p-4">
            <div className="flex gap-2">
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name (e.g. Nursery)"
                className="touch-target"
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
              />
              <Button onClick={createRoom} disabled={creating} className="touch-target">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </Card>
        )}

        {/* Room list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <Video className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-1 text-lg font-semibold">No rooms yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">Create your first room to start monitoring</p>
            <Button onClick={() => setShowCreate(true)} className="touch-target">
              <Plus className="mr-1 h-4 w-4" /> Create Room
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card key={room.id} className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold capitalize">
                      {room.room_name.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {room.is_active ? "🟢 Live" : "⚫ Offline"} · {room.room_type}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyRoomCode(room.room_name)}
                    >
                      {copiedId === room.room_name ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteRoom(room.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 touch-target"
                    onClick={() => navigate(`/camera/${room.room_name}`)}
                  >
                    <Camera className="mr-1 h-4 w-4" /> Start Camera
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 touch-target"
                    onClick={() => navigate(`/viewer/${room.room_name}`)}
                  >
                    <Eye className="mr-1 h-4 w-4" /> Watch
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
