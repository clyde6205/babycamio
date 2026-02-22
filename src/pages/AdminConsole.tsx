import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video, ArrowLeft, Users, MonitorPlay, CreditCard, Loader2, Shield,
  Search, AlertTriangle, Activity, Save, Settings as SettingsIcon, Gift, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomRow {
  id: string; room_name: string; owner_id: string; is_active: boolean; room_type: string; created_at: string;
}

interface SubRow {
  id: string; user_id: string; plan: string; status: string; payment_provider: string | null; current_period_end: string | null; created_at: string;
}

const AdminConsole = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [profiles, setProfiles] = useState<any[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ users: 0, rooms: 0, activeRooms: 0, proUsers: 0 });

  // Global motion settings (admin editable)
  const [globalMotion, setGlobalMotion] = useState({
    default_duration_minutes: 5,
    max_duration_minutes: 60,
    min_duration_minutes: 1,
    motion_sensitivity: 25,
    motion_min_percent: 1.5,
    cooldown_seconds: 3,
  });
  const [savingGlobal, setSavingGlobal] = useState(false);

  // Per-user camera settings (admin view/edit)
  const [userCameraSettings, setUserCameraSettings] = useState<any[]>([]);

  const { user: autoUser, loading: authLoading } = useAutoAuth();

  useEffect(() => {
    if (authLoading || !autoUser) return;
    const init = async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", autoUser.id);
      const hasAdmin = roles?.some((r: any) => r.role === "admin") ?? false;
      setIsAdmin(hasAdmin);

      if (!hasAdmin) { setLoading(false); return; }

      try {
        const { data, error } = await supabase.functions.invoke("admin-data", { body: {} });
        if (error) throw error;
        if (data) {
          setProfiles(data.profiles || []);
          setRooms(data.rooms || []);
          setSubscriptions(data.subscriptions || []);
          setStats(data.stats || { users: 0, rooms: 0, activeRooms: 0, proUsers: 0 });
          if (data.motionSettings) setGlobalMotion(data.motionSettings);
          if (data.userCameraSettings) setUserCameraSettings(data.userCameraSettings);
          if (data.referrals) setReferrals(data.referrals);
        }
      } catch (err: any) {
        toast({ title: "Error loading data", description: err.message, variant: "destructive" });
      }
      setLoading(false);
    };
    init();
  }, [autoUser, authLoading, toast]);

  const saveGlobalMotionSettings = async () => {
    setSavingGlobal(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "update_motion_settings", settings: globalMotion },
      });
      if (error) throw error;
      toast({ title: "Global settings saved", description: "All users will use these defaults" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSavingGlobal(false); }
  };

  const verifyReferral = async (referralId: string) => {
    setVerifyingId(referralId);
    try {
      const { data, error } = await supabase.functions.invoke("verify-referral", {
        body: { referral_id: referralId },
      });
      if (error) throw error;
      toast({ title: "Referral Verified!", description: data.message });
      setReferrals((prev) =>
        prev.map((r) => r.id === referralId ? { ...r, status: "rewarded", completed_at: new Date().toISOString() } : r)
      );
    } catch (err: any) {
      toast({ title: "Error verifying referral", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const updateUserCameraSetting = async (userId: string, field: string, value: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "update_user_camera", userId, field, value },
      });
      if (error) throw error;
      setUserCameraSettings((prev) =>
        prev.map((s) => s.user_id === userId ? { ...s, [field]: value } : s)
      );
      toast({ title: "User setting updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">{t("admin.accessDenied")}</h1>
        <p className="text-muted-foreground">{t("admin.noPrivileges")}</p>
        <Button onClick={() => navigate("/dashboard")}>{t("admin.backToDashboard")}</Button>
      </div>
    );
  }

  const filteredProfiles = profiles.filter(
    (p: any) => p.display_name?.toLowerCase().includes(search.toLowerCase()) || p.user_id?.includes(search)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <button onClick={() => navigate("/dashboard")} className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t("admin.title")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: t("admin.totalUsers"), value: stats.users, icon: Users },
            { label: t("admin.totalRooms"), value: stats.rooms, icon: MonitorPlay },
            { label: t("admin.activeNow"), value: stats.activeRooms, icon: Video },
            { label: t("admin.proSubscribers"), value: stats.proUsers, icon: CreditCard },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.searchPlaceholder")} className="pl-10" />
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="settings">
              <SettingsIcon className="h-3.5 w-3.5 mr-1" /> Global Settings
            </TabsTrigger>
            <TabsTrigger value="users">{t("admin.users")} ({profiles.length})</TabsTrigger>
            <TabsTrigger value="rooms">{t("admin.rooms")} ({rooms.length})</TabsTrigger>
            <TabsTrigger value="subs">{t("admin.subscriptions")} ({subscriptions.length})</TabsTrigger>
            <TabsTrigger value="camera">
              <Activity className="h-3.5 w-3.5 mr-1" /> User Cameras
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Gift className="h-3.5 w-3.5 mr-1" /> Referrals ({referrals.length})
            </TabsTrigger>
          </TabsList>

          {/* GLOBAL MOTION/RECORDING SETTINGS */}
          <TabsContent value="settings">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
                <Activity className="h-5 w-5 text-orange-500" />
                <div>
                  <h3 className="font-semibold">Motion Detection & Recording Defaults</h3>
                  <p className="text-xs text-muted-foreground">These settings apply to ALL users as defaults. Users can customize within your limits.</p>
                </div>
              </div>
              <div className="p-5 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Default Recording Duration</Label>
                    <span className="text-sm font-bold text-primary">{globalMotion.default_duration_minutes} min</span>
                  </div>
                  <Slider
                    value={[globalMotion.default_duration_minutes]}
                    onValueChange={([v]) => setGlobalMotion((p) => ({ ...p, default_duration_minutes: v }))}
                    min={1} max={120} step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Max Recording Duration (User Limit)</Label>
                    <span className="text-sm font-bold text-primary">{globalMotion.max_duration_minutes} min</span>
                  </div>
                  <Slider
                    value={[globalMotion.max_duration_minutes]}
                    onValueChange={([v]) => setGlobalMotion((p) => ({ ...p, max_duration_minutes: v }))}
                    min={1} max={240} step={1}
                  />
                  <p className="text-xs text-muted-foreground">Users cannot set recording longer than this</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Default Motion Sensitivity</Label>
                    <span className="text-sm font-bold text-primary">
                      {globalMotion.motion_sensitivity <= 10 ? "Very High" : globalMotion.motion_sensitivity <= 20 ? "High" : globalMotion.motion_sensitivity <= 35 ? "Medium" : globalMotion.motion_sensitivity <= 50 ? "Low" : "Very Low"}
                    </span>
                  </div>
                  <Slider
                    value={[globalMotion.motion_sensitivity]}
                    onValueChange={([v]) => setGlobalMotion((p) => ({ ...p, motion_sensitivity: v }))}
                    min={5} max={60} step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Motion Min % Threshold</Label>
                    <span className="text-sm font-bold text-primary">{globalMotion.motion_min_percent}%</span>
                  </div>
                  <Slider
                    value={[globalMotion.motion_min_percent * 10]}
                    onValueChange={([v]) => setGlobalMotion((p) => ({ ...p, motion_min_percent: v / 10 }))}
                    min={1} max={100} step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Cooldown Between Detections</Label>
                    <span className="text-sm font-bold text-primary">{globalMotion.cooldown_seconds}s</span>
                  </div>
                  <Slider
                    value={[globalMotion.cooldown_seconds]}
                    onValueChange={([v]) => setGlobalMotion((p) => ({ ...p, cooldown_seconds: v }))}
                    min={1} max={30} step={1}
                  />
                </div>

                <Button onClick={saveGlobalMotionSettings} disabled={savingGlobal} className="w-full touch-target">
                  {savingGlobal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Global Settings
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* PER-USER CAMERA SETTINGS */}
          <TabsContent value="camera">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Override individual user camera settings. Changes take effect on their next session.
              </p>
              {userCameraSettings.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No users have customized camera settings yet.</p>
              )}
              {userCameraSettings.map((s: any) => {
                const profile = profiles.find((p: any) => p.user_id === s.user_id);
                return (
                  <Card key={s.user_id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{profile?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{s.user_id.slice(0, 12)}...</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.motion_enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                          Motion: {s.motion_enabled ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Recording Duration</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={s.recording_duration_minutes}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setUserCameraSettings((prev) =>
                                prev.map((item) => item.user_id === s.user_id ? { ...item, recording_duration_minutes: val } : item)
                              );
                            }}
                            className="h-8 text-sm"
                            min={1}
                            max={globalMotion.max_duration_minutes}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => updateUserCameraSetting(s.user_id, "recording_duration_minutes", s.recording_duration_minutes)}
                          >
                            Set
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Sensitivity</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={s.motion_sensitivity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 25;
                              setUserCameraSettings((prev) =>
                                prev.map((item) => item.user_id === s.user_id ? { ...item, motion_sensitivity: val } : item)
                              );
                            }}
                            className="h-8 text-sm"
                            min={5}
                            max={60}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => updateUserCameraSetting(s.user_id, "motion_sensitivity", s.motion_sensitivity)}
                          >
                            Set
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-2">
              {filteredProfiles.map((p: any) => (
                <Card key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.display_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.user_id}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                </Card>
              ))}
              {filteredProfiles.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("admin.noUsersFound")}</p>}
            </div>
          </TabsContent>

          <TabsContent value="rooms">
            <div className="space-y-2">
              {rooms.map((r) => (
                <Card key={r.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{r.room_name.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.is_active ? `🟢 ${t("admin.live")}` : `⚫ ${t("admin.offline")}`} · {r.room_type} · {t("admin.owner")}: {r.owner_id.slice(0, 8)}...
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </Card>
              ))}
              {rooms.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("admin.noRooms")}</p>}
            </div>
          </TabsContent>

          <TabsContent value="subs">
            <div className="space-y-2">
              {subscriptions.map((s) => (
                <Card key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold mr-2 ${
                        s.plan === "pro" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-muted text-muted-foreground"
                      }`}>{s.plan.toUpperCase()}</span>
                      {s.status}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("admin.user")}: {s.user_id.slice(0, 8)}... · {s.payment_provider || "none"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                </Card>
              ))}
              {subscriptions.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("admin.noSubscriptions")}</p>}
            </div>
          </TabsContent>

          {/* REFERRALS */}
          <TabsContent value="referrals">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Verify referrals to grant both referrer and referred user <strong>2 months free Pro</strong>. If already Pro, their subscription is extended by 2 months.
              </p>
              {referrals.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No referrals yet.</p>
              )}
              {referrals.map((r: any) => {
                const referrerProfile = profiles.find((p: any) => p.user_id === r.referrer_id);
                const isRewarded = r.status === "rewarded";
                const isPending = r.status === "pending";
                return (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-yellow-500" />
                        <span className="font-mono text-sm font-bold">{r.referral_code}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isRewarded
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : isPending
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Referrer: {referrerProfile?.display_name || r.referrer_id.slice(0, 12) + "..."}</p>
                      {r.referred_email && <p>Referred: {r.referred_email}</p>}
                      {r.referred_user_id && <p>Referred User: {r.referred_user_id.slice(0, 12)}...</p>}
                      <p>Created: {new Date(r.created_at).toLocaleDateString()}</p>
                      {r.completed_at && <p>Completed: {new Date(r.completed_at).toLocaleDateString()}</p>}
                    </div>
                    {!isRewarded && (
                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => verifyReferral(r.id)}
                        disabled={verifyingId === r.id}
                      >
                        {verifyingId === r.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Verify & Grant 2 Months Pro
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-8 p-4 bg-muted/30">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> {t("admin.legalPages")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("admin.legalPagesDesc")} <code>/terms</code>, <code>/privacy</code>, <code>/disclaimer</code>.
          </p>
        </Card>
      </main>

      <footer className="border-t px-5 py-4 text-center text-xs text-muted-foreground">
        {t("common.copyright", { year: new Date().getFullYear() })} {t("admin.footerConsole")}.
      </footer>
    </div>
  );
};

export default AdminConsole;
