import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Shield, Video, Wifi, WifiOff, Volume2, Bell } from "lucide-react";
import heroImage from "@/assets/babycam-hero.webp";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen brand-gradient text-primary-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <Video className="h-7 w-7 text-[hsl(var(--brand-blue-light))]" />
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-[hsl(var(--brand-blue-light))]">Cam</span>.io
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher variant="light" />
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 touch-target"
            onClick={() => navigate("/pricing")}
          >
            {t("landing.pricing")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 touch-target"
            onClick={() => navigate("/login")}
          >
            {t("landing.login")}
          </Button>
          <Button
            size="sm"
            className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white touch-target"
            onClick={() => navigate("/signup")}
          >
            {t("landing.getStarted")}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pt-8 pb-6 md:px-8 md:pt-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={heroImage}
              alt="BabyCam.io Professional Monitoring Solutions — baby monitoring, home security, and vehicle surveillance"
              className="w-full h-auto"
              width={1456}
              height={816}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {t("landing.heroTitle")} <span className="text-brand-gradient">{t("landing.heroTitleSub")}</span>
          </h1>
          <p className="mb-8 max-w-xl text-base leading-relaxed text-primary-foreground/70 md:text-lg">
            {t("landing.heroDesc")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white text-base font-semibold px-8 touch-target"
              onClick={() => navigate("/signup")}
            >
              {t("landing.startFree")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-primary-foreground hover:bg-white/10 text-base touch-target"
              onClick={() => navigate("/login")}
            >
              {t("landing.signIn")}
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3 md:gap-6">
          {[
            { icon: Wifi, title: t("landing.multiNetwork"), desc: t("landing.multiNetworkDesc") },
            { icon: WifiOff, title: t("landing.audioFallback"), desc: t("landing.audioFallbackDesc") },
            { icon: Shield, title: t("landing.e2eSecure"), desc: t("landing.e2eSecureDesc") },
            { icon: Volume2, title: t("landing.twoWayAudio"), desc: t("landing.twoWayAudioDesc") },
            { icon: Bell, title: t("landing.smartAlerts"), desc: t("landing.smartAlertsDesc") },
            { icon: Video, title: t("landing.hdStreaming"), desc: t("landing.hdStreamingDesc") },
          ].map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              <f.icon className="mb-3 h-8 w-8 text-[hsl(var(--brand-blue-light))]" />
              <h3 className="mb-1 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-primary-foreground/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-5 py-6 mt-12">
        <div className="mx-auto max-w-5xl flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <p className="text-sm text-primary-foreground/40">
            {t("landing.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/terms")} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 underline">
              {t("landing.terms")}
            </button>
            <button onClick={() => navigate("/privacy")} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 underline">
              {t("landing.privacy")}
            </button>
            <button onClick={() => navigate("/disclaimer")} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 underline">
              {t("landing.disclaimer")}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
