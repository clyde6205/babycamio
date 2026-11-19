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
import { Switch } from "@/components/ui/switch";
import { Video, ArrowLeft, Save, Loader2, Eye, EyeOff, Check, AlertCircle, Settings as SettingsIcon, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BatteryGuide from "@/components/BatteryGuide";
import CopyrightFooter from "@/components/CopyrightFooter";

interface ProviderConfig {
  id: string; name: string; icon: string; description: string;
  keys: { name: string; label: string; placeholder: string }[];
}

const PROVIDERS: ProviderConfig[] = [
  { id: "twilio", name: "Twilio SMS", icon: "📱", description: "Send & receive SMS worldwide", keys: [{ name: "account_sid", label: "Account SID", placeholder: "AC..." }, { name: "auth_token", label: "Auth Token", placeholder: "Your auth token" }, { name: "phone_number", label: "Twilio Phone Number", placeholder: "+1234567890" }] },
];

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAutoAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, Record<string, string>>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [savedProviders, setSavedProviders] = useState<Set<string>>(new Set());

  // Camera/motion settings
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [recordingDuration, setRecordingDuration] = useState(5);
  const [motionSensitivity, setMotionSensitivity] = useState(25);
  const [maxDuration, setMaxDuration] = useState(60);
  const [savingCamera, setSavingCamera] = useState(false);
  const [cameraSettingsLoaded, setCameraSettingsLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      await Promise.all([loadKeys(user.id), loadCameraSettings(user.id)]);
    };
    init();
  }, [user, authLoading]);

  const loadCameraSettings = async (userId: string) => {
    // Load global limits
    const { data: globalSettings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "motion_recording")
      .single();

    const globalValue = globalSettings?.setting_value;
    if (globalValue && typeof globalValue === "object" && !Array.isArray(globalValue)) {
      const global = globalValue as Record<string, unknown>;
      const maxDuration = Number(global.max_duration_minutes);
      const sensitivity = Number(global.motion_sensitivity);
      const defaultDuration = Number(global.default_duration_minutes);
      setMaxDuration(Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : 60);
      setMotionSensitivity(Number.isFinite(sensitivity) && sensitivity > 0 ? sensitivity : 25);
      setRecordingDuration(Number.isFinite(defaultDuration) && defaultDuration > 0 ? defaultDuration : 5);
    }

    // Load user overrides
    const { data: userSettings } = await supabase
      .from("user_camera_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (userSettings) {
      setRecordingDuration(userSettings.recording_duration_minutes);
      setMotionEnabled(userSettings.motion_enabled);
      setMotionSensitivity(userSettings.motion_sensitivity);
    }
    setCameraSettingsLoaded(true);
  };

  const saveCameraSettings = async () => {
    if (!user) return;
    setSavingCamera(true);
    try {
      const clampedDuration = Math.min(Math.max(recordingDuration, 1), maxDuration);
      const { error } = await supabase
        .from("user_camera_settings")
        .upsert({
          user_id: user.id,
          recording_duration_minutes: clampedDuration,
          motion_enabled: motionEnabled,
          motion_sensitivity: motionSensitivity,
        }, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Camera settings saved", description: `Recording: ${clampedDuration} min, Motion: ${motionEnabled ? "On" : "Off"}` });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unexpected settings error", variant: "destructive" });
    } finally { setSavingCamera(false); }
  };

  const loadKeys = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase.from("provider_settings").select("provider, key_name, key_value").eq("user_id", userId);
    if (data) {
      const grouped: Record<string, Record<string, string>> = {};
      const configured = new Set<string>();
      data.forEach((row) => {
        if (!grouped[row.provider]) grouped[row.provider] = {};
        grouped[row.provider][row.key_name] = row.key_value;
        configured.add(row.provider);
      });
      setKeyValues(grouped);
      setSavedProviders(configured);
    }
    setLoading(false);
  };

  const updateKeyValue = (provider: string, keyName: string, value: string) => {
    setKeyValues((prev) => ({ ...prev, [provider]: { ...prev[provider], [keyName]: value } }));
  };

  const saveProvider = async (provider: ProviderConfig) => {
    if (!user) return;
    setSaving(provider.id);
    try {
      const values = keyValues[provider.id] || {};
      const requiredKeys = provider.keys.filter(k => !k.label.includes("optional"));
      const missing = requiredKeys.filter(k => !values[k.name]?.trim());
      if (missing.length > 0) {
        toast({ title: t("settings.missingKeys"), description: `Please fill in: ${missing.map(k => k.label).join(", ")}`, variant: "destructive" });
        setSaving(null); return;
      }
      for (const key of provider.keys) {
        const val = values[key.name]?.trim();
        if (!val) continue;
        const { error } = await supabase.from("provider_settings").upsert({ user_id: user.id, provider: provider.id, key_name: key.name, key_value: val }, { onConflict: "user_id,provider,key_name" });
        if (error) throw error;
      }
      setSavedProviders((prev) => new Set([...prev, provider.id]));
      toast({ title: `${provider.name} configured`, description: t("settings.keysSaved") });
    } catch (err: unknown) {
      toast({ title: t("common.error"), description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setSaving(null); }
  };

  const deleteProvider = async (providerId: string) => {
    if (!user) return;
    setSaving(providerId);
    try {
      const { error } = await supabase.from("provider_settings").delete().eq("user_id", user.id).eq("provider", providerId);
      if (error) throw error;
      setKeyValues((prev) => { const next = { ...prev }; delete next[providerId]; return next; });
      setSavedProviders((prev) => { const next = new Set(prev); next.delete(providerId); return next; });
      toast({ title: t("settings.providerRemoved") });
    } catch (err: unknown) {
      toast({ title: t("common.error"), description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setSaving(null); }
  };

  const toggleVisibility = (key: string) => setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="touch-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Baby<span className="text-primary">Cam</span>.io
            </span>
          </div>
          <span className="ml-2 text-sm text-muted-foreground">/ {t("settings.title")}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        {/* Camera & Motion Settings */}
        <Card className="mb-6 overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <h3 className="font-semibold">Motion Detection & Recording</h3>
                <p className="text-xs text-muted-foreground">Configure auto-recording when motion is detected</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Motion Detection</Label>
                <p className="text-xs text-muted-foreground">Automatically detect movement</p>
              </div>
              <Switch checked={motionEnabled} onCheckedChange={setMotionEnabled} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Recording Duration</Label>
                <span className="text-sm font-bold text-primary">{recordingDuration} min</span>
              </div>
              <Slider
                value={[recordingDuration]}
                onValueChange={([v]) => setRecordingDuration(v)}
                min={1}
                max={maxDuration}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How long to record after motion is detected (max {maxDuration} min set by admin)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Motion Sensitivity</Label>
                <span className="text-sm font-bold text-primary">
                  {motionSensitivity <= 10 ? "Very High" : motionSensitivity <= 20 ? "High" : motionSensitivity <= 35 ? "Medium" : motionSensitivity <= 50 ? "Low" : "Very Low"}
                </span>
              </div>
              <Slider
                value={[motionSensitivity]}
                onValueChange={([v]) => setMotionSensitivity(v)}
                min={5}
                max={60}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower value = more sensitive to small movements
              </p>
            </div>

            <Button onClick={saveCameraSettings} disabled={savingCamera} size="sm" className="touch-target w-full">
              {savingCamera ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save Camera Settings
            </Button>
          </div>
        </Card>

        {/* Payment Providers Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("settings.paymentProviders")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("settings.desc")}</p>
          <p className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Payment processing is managed by BabyCam.io. Stripe, PayMongo, PayPal, M-Pesa, and BitPay credentials must be configured as secure deployment secrets by the platform operator; personal settings keys do not activate checkout.</p>
        </div>

        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const isConfigured = savedProviders.has(provider.id);
            const isSaving = saving === provider.id;
            return (
              <Card key={provider.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <h3 className="font-semibold">{provider.name}</h3>
                      <p className="text-xs text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConfigured ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-3 w-3" /> {t("settings.active")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AlertCircle className="h-3 w-3" /> {t("settings.notConfigured")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {provider.keys.map((key) => {
                    const fullKey = `${provider.id}.${key.name}`;
                    const currentValue = keyValues[provider.id]?.[key.name] || "";
                    const isVisible = visibility[fullKey];
                    return (
                      <div key={key.name} className="space-y-1.5">
                        <Label htmlFor={fullKey} className="text-sm font-medium">{key.label}</Label>
                        <div className="relative">
                          <Input id={fullKey} type={isVisible ? "text" : "password"} value={currentValue} onChange={(e) => updateKeyValue(provider.id, key.name, e.target.value)} placeholder={key.placeholder} className="pr-10 font-mono text-sm" />
                          <button type="button" onClick={() => toggleVisibility(fullKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => saveProvider(provider)} disabled={isSaving} size="sm" className="touch-target">
                      {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                      {isConfigured ? t("settings.updateKeys") : t("settings.saveKeys")}
                    </Button>
                    {isConfigured && (
                      <Button variant="outline" size="sm" onClick={() => deleteProvider(provider.id)} disabled={isSaving} className="touch-target text-destructive hover:text-destructive">
                        {t("settings.remove")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 p-4 bg-muted/30">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" /> {t("settings.livekitTitle")}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{t("settings.livekitDesc")}</p>
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit">
            <Check className="h-3 w-3" /> {t("settings.configured")}
          </span>
        </Card>

        {/* Battery Optimization Guide */}
        <div className="mt-6">
          <BatteryGuide />
        </div>
      </main>
      <CopyrightFooter variant="dark" showLinks={false} />
    </div>
  );
};

export default Settings;
