import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Check, ArrowLeft, Crown, Zap, Globe, Shield, Headphones } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Pricing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { subscription, loading: subLoading, isPro } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)); }, []);

  const handleSubscribe = async (provider: string) => {
    if (!user) { navigate("/signup"); return; }
    setSelectedProvider(provider);
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { provider, plan: "pro", billing: billingCycle } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else if (data?.message) toast({ title: "Info", description: data.message });
    } catch (err: any) {
      toast({ title: "Payment Unavailable", description: err.message || `${provider} is not configured yet.`, variant: "destructive" });
    } finally { setProcessing(false); setSelectedProvider(null); }
  };

  return (
    <div className="min-h-screen brand-gradient text-primary-foreground">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="touch-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-[hsl(var(--brand-blue-light))]" />
            <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Baby<span className="text-[hsl(var(--brand-blue-light))]">Cam</span>.io
            </span>
          </div>
        </div>
        <LanguageSwitcher variant="light" />
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold md:text-4xl">{t("pricing.title")}</h1>
          <p className="text-primary-foreground/60 text-lg">{t("pricing.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Plan */}
          <Card className="relative overflow-hidden border-white/10 bg-white/5 p-6 text-primary-foreground backdrop-blur-sm">
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-5 w-5 text-[hsl(var(--brand-blue-light))]" />
                <h2 className="text-xl font-bold">{t("pricing.free")}</h2>
              </div>
              <p className="text-sm text-primary-foreground/50">{t("pricing.adSupported")}</p>
              <div className="mt-4">
                <span className="text-4xl font-extrabold">$0</span>
                <span className="text-primary-foreground/50">{t("pricing.month")}</span>
              </div>
            </div>
            <ul className="mb-8 space-y-3">
              {(t("pricing.freeFeatures", { returnObjects: true }) as string[]).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-[hsl(var(--brand-blue-light))]" /> {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full border-white/20 text-primary-foreground hover:bg-white/10 touch-target" onClick={() => !user ? navigate("/signup") : navigate("/dashboard")}>
              {isPro ? "Current: Pro" : subscription ? t("pricing.currentPlan") : t("pricing.getStartedFree")}
            </Button>
          </Card>

          {/* Pro Plan */}
          <Card className="relative overflow-hidden border-[hsl(var(--brand-blue))]/50 bg-white/5 p-6 text-primary-foreground backdrop-blur-sm ring-2 ring-[hsl(var(--brand-blue))]/30">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[hsl(var(--brand-blue))]/20 blur-2xl" />
            <div className="absolute -top-1 right-4 rounded-b-lg bg-[hsl(var(--brand-blue))] px-3 py-1 text-xs font-bold text-white">
              {t("pricing.mostPopular")}
            </div>
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h2 className="text-xl font-bold">{t("pricing.pro")}</h2>
              </div>
              <p className="text-sm text-primary-foreground/50">{t("pricing.noAdsEver")}</p>
              <div className="mt-4 flex items-baseline gap-1">
                {billingCycle === "monthly" ? (
                  <>
                    <span className="text-4xl font-extrabold">$9.97</span>
                    <span className="text-primary-foreground/50">{t("pricing.month")}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold">$89</span>
                    <span className="text-primary-foreground/50">{t("pricing.year")}</span>
                    <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">{t("pricing.save26")}</span>
                  </>
                )}
              </div>
              {/* Billing toggle */}
              <div className="mt-3 flex rounded-lg bg-white/10 p-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${billingCycle === "monthly" ? "bg-white/20 text-white" : "text-primary-foreground/50"}`}
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${billingCycle === "annual" ? "bg-white/20 text-white" : "text-primary-foreground/50"}`}
                >
                  {t("pricing.annual")} 🎉
                </button>
              </div>
            </div>
            <ul className="mb-8 space-y-3">
              {(t("pricing.proFeatures", { returnObjects: true }) as string[]).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-yellow-400" /> {f}
                </li>
              ))}
            </ul>

            {isPro ? (
              <Button className="w-full bg-green-600 text-white font-semibold touch-target" disabled>
                {t("pricing.activeProSub")}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-medium text-primary-foreground/60 uppercase tracking-wider">{t("pricing.choosePayment")}</p>
                {[
                  { id: "stripe", nameKey: "pricing.creditDebit", icon: "💳", regionKey: "pricing.global" },
                  { id: "paypal", nameKey: "pricing.paypal", icon: "🅿️", regionKey: "pricing.global" },
                  { id: "paymongo", nameKey: "pricing.gcashMaya", icon: "🇵🇭", regionKey: "pricing.philippines" },
                  { id: "mpesa", nameKey: "pricing.mpesa", icon: "🇰🇪", regionKey: "pricing.africaRegions" },
                ].map((p) => (
                  <Button key={p.id} className="w-full justify-between bg-white/10 hover:bg-white/20 text-primary-foreground font-medium touch-target" onClick={() => handleSubscribe(p.id)} disabled={processing}>
                    <span className="flex items-center gap-2"><span className="text-lg">{p.icon}</span>{t(p.nameKey)}</span>
                    <span className="text-xs text-primary-foreground/40">{t(p.regionKey)}</span>
                  </Button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Shield, label: t("pricing.bankGrade") },
            { icon: Globe, label: t("pricing.available190") },
            { icon: Headphones, label: t("pricing.support247") },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="h-6 w-6 text-[hsl(var(--brand-blue-light))]" />
              <span className="text-xs text-primary-foreground/50">{label}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-sm text-primary-foreground/40">
        {t("common.copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
};

export default Pricing;
