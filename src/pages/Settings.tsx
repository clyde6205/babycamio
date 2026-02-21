import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, ArrowLeft, Save, Loader2, Eye, EyeOff, Check, AlertCircle, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface ProviderConfig {
  id: string; name: string; icon: string; description: string;
  keys: { name: string; label: string; placeholder: string }[];
}

const PROVIDERS: ProviderConfig[] = [
  { id: "stripe", name: "Stripe", icon: "💳", description: "Credit/Debit cards — Global", keys: [{ name: "secret_key", label: "Secret Key", placeholder: "sk_live_..." }, { name: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_..." }] },
  { id: "paypal", name: "PayPal", icon: "🅿️", description: "PayPal payments — Global", keys: [{ name: "client_id", label: "Client ID", placeholder: "AX..." }, { name: "secret", label: "Secret", placeholder: "EL..." }] },
  { id: "paymongo", name: "PayMongo (GCash/Maya)", icon: "🇵🇭", description: "GCash & Maya — Philippines", keys: [{ name: "secret_key", label: "Secret Key", placeholder: "sk_live_..." }, { name: "webhook_secret", label: "Webhook Secret (optional)", placeholder: "whsec_..." }] },
  { id: "mpesa", name: "M-Pesa", icon: "🇰🇪", description: "Mobile Money — Kenya, Tanzania, Africa", keys: [{ name: "consumer_key", label: "Consumer Key", placeholder: "Consumer key from Daraja" }, { name: "consumer_secret", label: "Consumer Secret", placeholder: "Consumer secret from Daraja" }, { name: "shortcode", label: "Business Shortcode", placeholder: "174379" }, { name: "passkey", label: "Passkey", placeholder: "Lipa na M-Pesa passkey" }] },
];

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [keyValues, setKeyValues] = useState<Record<string, Record<string, string>>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [savedProviders, setSavedProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      await loadKeys(session.user.id);
    };
    init();
  }, [navigate]);

  const loadKeys = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase.from("provider_settings").select("provider, key_name, key_value").eq("user_id", userId);
    if (data) {
      const grouped: Record<string, Record<string, string>> = {};
      const configured = new Set<string>();
      data.forEach((row: any) => {
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
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
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
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("settings.paymentProviders")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("settings.desc")}</p>
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
      </main>
    </div>
  );
};

export default Settings;
