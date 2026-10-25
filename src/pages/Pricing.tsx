import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Check, ArrowLeft, Crown, Zap, Shield, LockKeyhole, Clock } from "lucide-react";
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
  const { subscription, isPro } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleSubscribe = async (provider: string) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    setProcessing(true);
    try {
      const functionName = provider === "bitpay" ? "create-bitpay-checkout" : "create-checkout";
      const body = provider === "bitpay"
        ? { plan: "pro", billing: billingCycle }
        : { provider, plan: "pro", billing: billingCycle };

      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      if (data?.url) window.location.href = data.url;
      else throw new Error("The payment provider did not return a checkout link.");
    } catch (err: any) {
      toast({
        title: "Payment unavailable",
        description: err.message || "This payment method is not configured yet.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen brand-gradient text-primary-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate(-1)} className="touch-target flex items-center justify-center" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <Video className="h-6 w-6 shrink-0 text-[hsl(var(--brand-blue-light))]" />
            <span className="truncate text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Baby<span className="text-[hsl(var(--brand-blue-light))]">Cam</span>.io
            </span>
          </div>
        </div>
        <LanguageSwitcher variant="light" />
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold md:text-4xl">{t("pricing.title")}</h1>
          <p className="text-lg text-primary-foreground/60">{t("pricing.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
              {(t("pricing.freeFeatures", { returnObjects: true }) as string[]).map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-[hsl(var(--brand-blue-light))]" /> {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="touch-target w-full border-white/20 text-primary-foreground hover:bg-white/10" onClick={() => !user ? navigate("/signup") : navigate("/dashboard")}>
              {isPro ? "Current: Pro" : subscription ? t("pricing.currentPlan") : t("pricing.getStartedFree")}
            </Button>
          </Card>

          <Card className="relative overflow-hidden border-[hsl(var(--brand-blue))]/50 bg-white/5 p-6 text-primary-foreground ring-2 ring-[hsl(var(--brand-blue))]/30 backdrop-blur-sm">
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
                    <span className="text-4xl font-extrabold">$10.97</span>
                    <span className="text-primary-foreground/50">{t("pricing.month")}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold">$99</span>
                    <span className="text-primary-foreground/50">{t("pricing.year")}</span>
                    <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">Save about 25%</span>
                  </>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 rounded-lg bg-white/10 p-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${billingCycle === "monthly" ? "bg-white/20 text-white" : "text-primary-foreground/50"}`}
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${billingCycle === "annual" ? "bg-white/20 text-white" : "text-primary-foreground/50"}`}
                >
                  {t("pricing.annual")}
                </button>
              </div>
            </div>
            <ul className="mb-8 space-y-3">
              {(t("pricing.proFeatures", { returnObjects: true }) as string[]).map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-yellow-400" /> {feature}
                </li>
              ))}
            </ul>

            {isPro ? (
              <Button className="touch-target w-full bg-green-600 font-semibold text-white" disabled>
                {t("pricing.activeProSub")}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary-foreground/60">{t("pricing.choosePayment")}</p>
                <Button
                  className="touch-target w-full justify-between bg-white/10 font-medium text-primary-foreground hover:bg-white/20"
                  onClick={() => handleSubscribe("stripe")}
                  disabled={processing}
                >
                  <span>{t("pricing.creditDebit")}</span>
                  <span className="text-xs text-primary-foreground/40">{t("pricing.global")}</span>
                </Button>
                <Button
                  className="touch-target w-full justify-between bg-gradient-to-r from-blue-600/30 to-indigo-600/30 font-medium text-primary-foreground ring-1 ring-blue-400/30 hover:from-blue-600/40 hover:to-indigo-600/40"
                  onClick={() => handleSubscribe("bitpay")}
                  disabled={processing}
                >
                  <span>Pay with XRP</span>
                  <span className="text-xs text-primary-foreground/40">{t("pricing.global")}</span>
                </Button>
                <p className="pt-2 text-xs leading-5 text-primary-foreground/50">
                  Additional regional payment methods are hidden until their verified checkout and webhook flows are configured.
                </p>
              </div>
            )}
          </Card>
        </div>

        <Card id="business" className="mt-6 border-primary/40 bg-white/5 p-6 text-primary-foreground backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold">
                Business & Daycare
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase">Teams</span>
              </h3>
              <p className="mt-0.5 text-sm text-primary-foreground/50">For daycares, nurseries, nannies and care homes</p>
              <ul className="mt-2 space-y-1">
                {["Multi-camera management", "Staff access controls", "Private viewing links", "Recordings and alerts", "Priority onboarding"].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-primary-foreground/60"><Check className="h-3 w-3 text-primary" /> {feature}</li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 text-center sm:text-right">
              <div className="mb-2"><span className="text-3xl font-extrabold">Custom</span></div>
              <Button asChild className="touch-target w-full px-6 sm:w-auto">
                <a href="mailto:admin@babycam.io?subject=BabyCam.io%20Business%20%26%20Daycare%20plan">Contact sales</a>
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-12 grid grid-cols-1 gap-4 text-center min-[430px]:grid-cols-3">
          {[
            { icon: Shield, label: "Signed payment webhooks" },
            { icon: LockKeyhole, label: "Private viewer links" },
            { icon: Clock, label: "Cancel anytime" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
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
