import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Activity, Baby, BatteryCharging, Bot, Camera, Cctv, Check, Copy, Crosshair, Crown,
  Download, Eye, Film, Gift, Heart, Loader2, LogOut, Moon, Plus, Ruler, Settings,
  Share2, Shield, Smartphone, Star, Trash2, UserPlus, Video,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useToast } from "@/hooks/use-toast";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import ShareDialog from "@/components/ShareDialog";
import ShareSheet from "@/components/ShareSheet";
import { viewerLink } from "@/lib/share";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MultiCameraGrid from "@/components/MultiCameraGrid";
import OnboardingWizard from "@/components/OnboardingWizard";
import CopyrightFooter from "@/components/CopyrightFooter";
import AdBanner from "@/components/AdBanner";
import SponsorVideoPlayer from "@/components/SponsorVideoPlayer";

interface Room {
  id: string;
  room_name: string;
  is_active: boolean;
  room_type: string;
  created_at: string;
}

const roomDisplayName = (roomName: string) =>
  roomName.replace(/-[a-z0-9]+$/i, "").replace(/-/g, " ") || roomName;

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAutoAuth();
  const { config } = useAppSettings();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareRoom, setShareRoom] = useState<Room | null>(null);
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

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true);
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("babycam_onboarded")) setShowOnboarding(true);
  }, []);

  const fetchRooms = async () => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select("id, room_name, is_active, room_type, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else if (data) {
      setRooms(data as Room[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      if (!user) {
        await fetchRooms();
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setIsAdmin(Boolean(roles?.some((r: any) => r.role === "admin")));
      await fetchRooms();
    };
    if (!authLoading) void load();
  }, [user, authLoading]);

  const createRoom = async () => {
    const label = newRoomName.trim().replace(/\s+/g, " ");
    if (!label) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Create an account before starting a camera.", variant: "destructive" });
      navigate("/login");
      return;
    }

    const roomLimit = Math.max(1, isPro ? config.pro_max_cameras : config.free_max_cameras);
    if (rooms.length >= roomLimit) {
      toast({
        title: isPro ? "Room limit reached" : "Free plan limit reached",
        description: isPro ? `Your plan allows ${roomLimit} rooms.` : "Upgrade to Pro for more camera rooms.",
        variant: "destructive",
      });
      if (!isPro) navigate("/pricing");
      return;
    }

    setCreating(true);
    const slug = label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "camera";
    const roomSlug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;

    const { error } = await supabase.from("rooms").insert({
      room_name: roomSlug,
      owner_id: user.id,
      room_type: "baby",
    });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setNewRoomName("");
      setShowCreate(false);
      await fetchRooms();
      toast({ title: t("dashboard.roomCreated"), description: `"${label}" is ready to use.` });
    }
    setCreating(false);
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    setRooms((prev) => prev.filter((r) => r.id !== id));
    toast({ title: t("dashboard.roomDeleted") });
  };

  const copyRoomLink = async (room: Room) => {
    await navigator.clipboard.writeText(viewerLink(room.id));
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Secure viewer link copied", description: "Send this private link only to people you trust." });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleJoinRoom = () => {
    const code = joinCode.trim();
    if (!code) return;
    navigate(`/viewer/${encodeURIComponent(code)}`);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">BabyCam.io</span>
          </div>
          <LanguageSwitcher />
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-10">
          <Card className="w-full max-w-md p-6 text-center">
            <Video className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="text-2xl font-bold">Sign in to manage cameras</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Camera ownership, recordings, alerts, and settings require an account. Shared viewers can still use the private link sent by the owner.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button onClick={() => navigate("/login")} className="touch-target">Sign in</Button>
              <Button variant="outline" onClick={() => navigate("/signup")} className="touch-target">Create account</Button>
            </div>
          </Card>
        </main>
        <CopyrightFooter variant="dark" showLinks={false} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Video className="h-6 w-6 shrink-0 text-primary" />
          <span className="truncate text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-primary">Cam</span>.io
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <LanguageSwitcher />
          {!isPro && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="touch-target text-yellow-500">
              <Crown className="mr-1 h-4 w-4" /> <span className="hidden xs:inline">{t("dashboard.upgrade")}</span><span className="xs:hidden">Pro</span>
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" onClick={() => navigate("/admin")} className="touch-target bg-gradient-to-r from-amber-400 to-orange-500 font-bold text-slate-950 shadow-lg shadow-orange-500/30 hover:opacity-90">
              <Shield className="mr-1 h-4 w-4" /> Admin
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="touch-target" title={t("settings.title")}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="touch-target" title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
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

        {showJoin && (
          <Card className="mb-6 p-4">
            <p className="mb-2 text-sm text-muted-foreground">Paste the private viewer code or link sent by the camera owner:</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Private viewer code"
                className="touch-target"
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />
              <Button onClick={handleJoinRoom} className="touch-target">
                <Eye className="mr-1 h-4 w-4" /> Watch
              </Button>
            </div>
          </Card>
        )}

        {showCreate && (
          <Card className="mb-6 p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder={t("dashboard.roomPlaceholder")} className="touch-target" onKeyDown={(e) => e.key === "Enter" && createRoom()} />
              <Button onClick={createRoom} disabled={creating} className="touch-target">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("dashboard.create")}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-8 text-center sm:p-12">
            <Eye className="mx-auto mb-3 h-12 w-12 text-primary/40" />
            <h3 className="mb-1 text-lg font-semibold">Welcome to BabyCam.io</h3>
            <p className="mb-4 text-sm text-muted-foreground">Create your first private camera room to start broadcasting.</p>
            <Button size="lg" onClick={() => setShowCreate(true)} className="touch-target">
              <Plus className="mr-2 h-5 w-5" /> Set Up My Camera
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card key={room.id} className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold capitalize">{roomDisplayName(room.room_name)}</h3>
                    <p className="text-xs text-muted-foreground">{room.is_active ? `🟢 ${t("dashboard.live")}` : `⚫ ${t("dashboard.offline")}`} · {room.room_type}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <ShareDialog roomId={room.id} roomName={room.room_name} userId={user.id} />
                    <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => copyRoomLink(room)} aria-label="Copy viewer link">
                      {copiedId === room.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive" onClick={() => deleteRoom(room.id)} aria-label="Delete room">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="lg" className="touch-target w-full bg-success text-base font-bold text-success-foreground hover:bg-success/90" onClick={() => setShareRoom(room)}>
                    <Share2 className="mr-2 h-5 w-5" /> Share Camera — QR & WhatsApp
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button size="sm" className="touch-target" onClick={() => navigate(`/camera/${room.room_name}`)}>
                      <Camera className="mr-1 h-4 w-4" /> {t("dashboard.startCamera")}
                    </Button>
                    <Button size="sm" variant="secondary" className="touch-target" onClick={() => navigate(`/viewer/${room.id}`)}>
                      <Eye className="mr-1 h-4 w-4" /> {t("dashboard.watch")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <MultiCameraGrid rooms={rooms} />

        <div className="mb-4 mt-8">
          <h2 className="mb-1 text-lg font-bold">{t("dashboard.handyTools")}</h2>
          <p className="text-xs text-muted-foreground">{t("dashboard.handyToolsDesc")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-3 sm:grid-cols-4">
          {[
            ["/recordings", Film, "Recordings", "text-primary"],
            ["/sleep", Moon, "Sleep", "text-indigo-400"],
            ["/care-log", Baby, "Care Log", "text-blue-400"],
            ["/milestones", Star, "Milestones", "text-yellow-400"],
            ["/caregiver", UserPlus, "Caregiver", "text-purple-400"],
            ["/family", Heart, "Family", "text-red-400"],
            ["/referral", Gift, "Refer", "text-yellow-400"],
            ["/ai", Bot, t("dashboard.aiAssistant"), "text-primary"],
            ["/troubleshoot", Activity, "Fix viewer error", "text-destructive"],
            ["/tools/measure", Ruler, t("dashboard.measure"), "text-primary"],
            ["/tools/level", Crosshair, t("dashboard.level"), "text-primary"],
            ["/settings", BatteryCharging, "Battery", "text-green-400"],
            ["/install", Download, "Install & Share", "text-primary"],
            ["/diagnostics", Activity, "Diagnostics", "text-primary"],
            ["/external-cameras", Cctv, "CCTV", "text-primary"],
          ].map(([path, Icon, label, tone]) => {
            const TypedIcon = Icon as typeof Film;
            return (
              <button key={String(path)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate(String(path))}>
                <TypedIcon className={`h-6 w-6 ${tone}`} />
                <span className="text-center text-xs font-medium leading-4">{String(label)}</span>
              </button>
            );
          })}
        </div>

        {!isInstalled && (
          <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 sm:right-6">
            <Button
              size="lg"
              className="gap-2 rounded-full px-5 shadow-lg shadow-primary/30"
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
              <Smartphone className="h-5 w-5" /> Install App
            </Button>
          </div>
        )}
        <SponsorVideoPlayer placement="dashboard" className="mt-6" />
      </main>

      <AdBanner />
      {shareRoom && (
        <ShareSheet
          open={Boolean(shareRoom)}
          onOpenChange={(open) => !open && setShareRoom(null)}
          url={viewerLink(shareRoom.id)}
          title={roomDisplayName(shareRoom.room_name)}
          roomName={shareRoom.room_name}
        />
      )}
      <CopyrightFooter variant="dark" showLinks={false} />
    </div>
  );
};

export default Dashboard;
