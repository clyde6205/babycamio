import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Video, Plus, Camera, Eye, LogOut, Loader2, Trash2, Copy, Check, Crown, Settings, Shield, Ruler, Crosshair, Bot, Film, Moon, Heart, Gift, BatteryCharging, Users, Baby, Star, UserPlus, Download, Share2, Activity, Smartphone, Cctv } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import ShareDialog from "@/components/ShareDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MultiCameraGrid from "@/components/MultiCameraGrid";
import OnboardingWizard from "@/components/OnboardingWizard";
import CopyrightFooter from "@/components/CopyrightFooter";

interface Room {
  id: string;
  room_name: string;
  is_active: boolean;
  room_type: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAutoAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const { isPro } = useSubscription();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // PWA install prompt listener
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("babycam_onboarded")) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (roles?.some((r: any) => r.role === "admin")) setIsAdmin(true);
      }
      await fetchRooms();
    };
    load();
  }, [user]);

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
    const ownerId = user?.id || crypto.randomUUID();
    const { error } = await supabase.from("rooms").insert({
      room_name: roomSlug, owner_id: ownerId, room_type: "baby",
    });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setNewRoomName(""); setShowCreate(false); await fetchRooms();
      toast({ title: t("dashboard.roomCreated"), description: `"${newRoomName}" is ready to use.` });
    }
    setCreating(false);
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (!error) { setRooms((prev) => prev.filter((r) => r.id !== id)); toast({ title: t("dashboard.roomDeleted") }); }
  };

  const copyRoomCode = (roomName: string) => {
    const appBase = "https://babycamio.lovable.app";
    const viewerUrl = `${appBase}/viewer/${roomName}`;
    navigator.clipboard.writeText(viewerUrl);
    setCopiedId(roomName);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Viewer link copied!", description: "Send this link to anyone to let them watch." });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleJoinRoom = () => {
    const code = joinCode.trim();
    if (!code) return;
    // Navigate directly to viewer with the room code
    navigate(`/viewer/${code}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-primary">Cam</span>.io
          </span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          {!isPro && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="touch-target text-yellow-500">
              <Crown className="h-4 w-4 mr-1" /> {t("dashboard.upgrade")}
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="touch-target" title="Founder's Console">
              <Shield className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="touch-target" title={t("settings.title")}>
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
            <h1 className="text-2xl font-bold">{t("dashboard.myRooms")}</h1>
            <p className="text-sm text-muted-foreground">{t("dashboard.manageRooms")}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="touch-target">
              <Plus className="mr-1 h-4 w-4" /> {t("dashboard.newRoom")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowJoin(!showJoin)} className="touch-target">
              <Eye className="mr-1 h-4 w-4" /> Join Room
            </Button>
          </div>
        </div>

        {/* Join existing room by code */}
        {showJoin && (
          <Card className="mb-6 p-4">
            <p className="text-sm text-muted-foreground mb-2">Enter a room code to watch a camera shared with you:</p>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. nursery-abc123"
                className="touch-target"
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />
              <Button onClick={handleJoinRoom} className="touch-target">
                <Eye className="h-4 w-4 mr-1" /> Watch
              </Button>
            </div>
          </Card>
        )}

        {showCreate && (
          <Card className="mb-6 p-4">
            <div className="flex gap-2">
              <Input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder={t("dashboard.roomPlaceholder")} className="touch-target" onKeyDown={(e) => e.key === "Enter" && createRoom()} />
              <Button onClick={createRoom} disabled={creating} className="touch-target">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("dashboard.create")}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <Eye className="mx-auto mb-3 h-12 w-12 text-primary/40" />
            <h3 className="mb-1 text-lg font-semibold">Welcome to BabyCam.io</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Join an existing camera to watch, or create a new room to start broadcasting.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => setShowJoin(true)} className="touch-target">
                <Eye className="mr-2 h-5 w-5" /> Join & Watch a Camera
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowCreate(true)} className="touch-target">
                <Plus className="mr-2 h-5 w-5" /> Set Up My Camera
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card key={room.id} className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold capitalize">{room.room_name.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}</h3>
                    <p className="text-xs text-muted-foreground">{room.is_active ? `🟢 ${t("dashboard.live")}` : `⚫ ${t("dashboard.offline")}`} · {room.room_type}</p>
                  </div>
                  <div className="flex gap-1">
                    {user && <ShareDialog roomId={room.id} roomName={room.room_name} userId={user.id} />}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyRoomCode(room.room_name)}>
                      {copiedId === room.room_name ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRoom(room.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {/* BIG SHARE BUTTON — the most important action */}
                  <Button
                    size="lg"
                    className="w-full touch-target bg-green-600 hover:bg-green-700 text-white font-bold text-base"
                    onClick={() => {
                      const link = `https://babycamio.lovable.app/viewer/${room.room_name}`;
                      if (navigator.share) {
                        navigator.share({ title: "BabyCam", text: "Watch my baby camera live!", url: link }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(link);
                        toast({ title: "Link copied!", description: link });
                      }
                    }}
                  >
                    <Share2 className="mr-2 h-5 w-5" /> Share Camera Link
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 touch-target" onClick={() => navigate(`/camera/${room.room_name}`)}>
                      <Camera className="mr-1 h-4 w-4" /> {t("dashboard.startCamera")}
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 touch-target" onClick={() => navigate(`/viewer/${room.room_name}`)}>
                      <Eye className="mr-1 h-4 w-4" /> {t("dashboard.watch")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Multi-Camera Grid */}
        <MultiCameraGrid rooms={rooms} />

        <div className="mt-8 mb-4">
          <h2 className="text-lg font-bold mb-1">{t("dashboard.handyTools")}</h2>
          <p className="text-xs text-muted-foreground">{t("dashboard.handyToolsDesc")}</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/recordings")}>
            <Film className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center">Recordings</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/sleep")}>
            <Moon className="h-6 w-6 text-indigo-400" />
            <span className="text-xs font-medium text-center">Sleep</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/care-log")}>
            <Baby className="h-6 w-6 text-blue-400" />
            <span className="text-xs font-medium text-center">Care Log</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/milestones")}>
            <Star className="h-6 w-6 text-yellow-400" />
            <span className="text-xs font-medium text-center">Milestones</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/caregiver")}>
            <UserPlus className="h-6 w-6 text-purple-400" />
            <span className="text-xs font-medium text-center">Caregiver</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/family")}>
            <Heart className="h-6 w-6 text-red-400" />
            <span className="text-xs font-medium text-center">Family</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/referral")}>
            <Gift className="h-6 w-6 text-yellow-400" />
            <span className="text-xs font-medium text-center">Refer</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/ai")}>
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center">{t("dashboard.aiAssistant")}</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/tools/measure")}>
            <Ruler className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center">{t("dashboard.measure")}</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/tools/level")}>
            <Crosshair className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center">{t("dashboard.level")}</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/settings")}>
            <BatteryCharging className="h-6 w-6 text-green-400" />
            <span className="text-xs font-medium text-center">Battery</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors border-primary/30 bg-primary/5" onClick={() => navigate("/install")}>
            <Download className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center">Install & Share</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/diagnostics")}>
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center">Diagnostics</span>
          </Card>
          <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors border-primary/30 bg-primary/5" onClick={() => navigate("/external-cameras")}>
            <Cctv className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center">CCTV</span>
          </Card>
        </div>

        {/* Floating Install Button */}
        {!isInstalled && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              size="lg"
              className="rounded-full shadow-lg shadow-primary/30 px-5 gap-2 animate-bounce"
              onClick={async () => {
                if (deferredPrompt) {
                  await deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === "accepted") setIsInstalled(true);
                  setDeferredPrompt(null);
                } else {
                  navigate("/install");
                }
              }}
            >
              <Smartphone className="h-5 w-5" />
              Install App
            </Button>
          </div>
        )}
      </main>

      <CopyrightFooter variant="dark" showLinks={false} />
    </div>
  );
};

export default Dashboard;
