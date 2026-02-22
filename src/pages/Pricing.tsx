import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Check, ArrowLeft, Crown, Zap, Globe, Shield, Headphones, Coins, MessageSquare } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CopyrightFooter from "@/components/CopyrightFooter";

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
      // BitPay/XRP uses a separate edge function
      const functionName = provider === "bitpay" ? "create-bitpay-checkout" : "create-checkout";
      const body = provider === "bitpay"
        ? { plan: "pro", billing: billingCycle }
        : { provider, plan: "pro", billing: billingCycle };

      const { data, error } = await supabase.functions.invoke(functionName, { body });
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
                  { id: "bitpay", nameKey: "Pay with XRP", icon: "⚡", regionKey: "pricing.global", highlight: true },
                  { id: "paymongo", nameKey: "pricing.gcashMaya", icon: "🇵🇭", regionKey: "pricing.philippines" },
                  { id: "mpesa", nameKey: "pricing.mpesa", icon: "🇰🇪", regionKey: "pricing.africaRegions" },
                ].map((p) => (
                  <Button
                    key={p.id}
                    className={`w-full justify-between font-medium touch-target ${
                      p.highlight
                        ? "bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 text-primary-foreground ring-1 ring-blue-400/30"
                        : "bg-white/10 hover:bg-white/20 text-primary-foreground"
                    }`}
                    onClick={() => handleSubscribe(p.id)}
                    disabled={processing}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{p.icon}</span>
                      {p.nameKey.startsWith("pricing.") ? t(p.nameKey) : p.nameKey}
                      {p.highlight && (
                        <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 uppercase">Fast</span>
                      )}
                    </span>
                    <span className="text-xs text-primary-foreground/40">{t(p.regionKey)}</span>
                  </Button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* SMS Sharing Add-on */}
        <Card className="mt-6 relative overflow-hidden border-white/10 bg-white/5 p-6 text-primary-foreground backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20 shrink-0">
                <MessageSquare className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Worldwide SMS Sharing
                  <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400 uppercase">Add-on</span>
                </h3>
                <p className="text-sm text-primary-foreground/50 mt-0.5">
                  Send recordings, photos & special moments via SMS to any phone number worldwide
                </p>
                <ul className="mt-2 space-y-1">
                  {[
                    "Send to any phone number globally",
                    "Share recordings & live camera links",
                    "Editable messages before sending",
                    "Powered by Twilio — reliable delivery",
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-primary-foreground/60">
                      <Check className="h-3 w-3 text-green-400" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <div className="mb-2">
                <span className="text-3xl font-extrabold">$3.97</span>
                <span className="text-primary-foreground/50 text-sm">/mo</span>
              </div>
              <Button
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold touch-target px-6"
                onClick={() => handleSubscribe("sms_sharing")}
                disabled={processing}
              >
                {selectedProvider === "sms_sharing" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...
                  </span>
                ) : (
                  "Add SMS Sharing"
                )}
              </Button>
              <p className="text-[10px] text-primary-foreground/40 mt-1">Cancel anytime</p>
            </div>
          </div>
        </Card>

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

      <CopyrightFooter variant="light" />
    </div>
  );
};

export default Pricing;
