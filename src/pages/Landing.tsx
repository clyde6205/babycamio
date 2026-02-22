import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Shield, Video, Wifi, WifiOff, Volume2, Bell, Star, Download, CheckCircle2, Globe, Copy, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import heroImage from "@/assets/babycam-hero.webp";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CopyrightFooter from "@/components/CopyrightFooter";

const APP_URL = "https://babycamio.lovable.app"; // install link

const TESTIMONIALS = [
  { name: "Sarah M.", country: "🇺🇸 USA", stars: 5, text: "Finally a baby monitor that works on our terrible rural Wi-Fi. Audio fallback is a lifesaver at 2AM." },
  { name: "Kenji T.", country: "🇯🇵 Japan", stars: 5, text: "4K画質でベビーモニターがこの価格？信じられない。毎晩使っています。" },
  { name: "Amina O.", country: "🇰🇪 Kenya", stars: 5, text: "Works perfectly on 3G. Cry detection alerts saved me many times. Best app for African parents." },
  { name: "Carlos R.", country: "🇧🇷 Brazil", stars: 5, text: "Uso com minha esposa — ela monitora do trabalho via 4G. Áudio bidirecional é incrível." },
  { name: "Priya S.", country: "🇮🇳 India", stars: 5, text: "Runs smoothly on my budget phone. No lag, no crashes. My whole family uses it to watch the baby." },
  { name: "Emma L.", country: "🇬🇧 UK", stars: 5, text: "Replaced our £200 baby monitor. Better video quality and I can check from anywhere in the world." },
];

const TRUST_BADGES = [
  { icon: Shield, label: "End-to-End Encrypted" },
  { icon: Globe, label: "190+ Countries" },
  { icon: CheckCircle2, label: "GDPR Compliant" },
  { icon: CheckCircle2, label: "COPPA Compliant" },
];

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
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 touch-target" onClick={() => navigate("/pricing")}>
            {t("landing.pricing")}
          </Button>
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 touch-target" onClick={() => navigate("/login")}>
            {t("landing.login")}
          </Button>
          <Button size="sm" className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white touch-target" onClick={() => navigate("/signup")}>
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
              loading="lazy"
              decoding="async"
            />
          </div>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {t("landing.heroTitle")} <span className="text-brand-gradient">{t("landing.heroTitleSub")}</span>
          </h1>
          <p className="mb-8 max-w-xl text-base leading-relaxed text-primary-foreground/70 md:text-lg">
            {t("landing.heroDesc")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white text-base font-semibold px-8 touch-target" onClick={() => navigate("/signup")}>
              {t("landing.startFree")}
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-primary-foreground hover:bg-white/10 text-base touch-target" onClick={() => navigate("/login")}>
              {t("landing.signIn")}
            </Button>
          </div>

          {/* Download counter + trust signal */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-primary-foreground/50">
            <div className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              <span>50,000+ families worldwide</span>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1">4.8/5 rating</span>
            </div>
          </div>

          {/* QR Code Install Section */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="flex-shrink-0">
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                  <QRCodeSVG value={APP_URL} size={180} />
                </div>
              </div>
              <div className="text-center md:text-left space-y-3">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Smartphone className="h-5 w-5 text-[hsl(var(--brand-blue-light))]" />
                  <h3 className="text-xl font-bold">Install on Your Phone</h3>
                </div>
                <p className="text-sm text-primary-foreground/60 max-w-sm">
                  Scan this QR code with your phone camera to instantly install BabyCam.io — no app store needed.
                </p>
                <div className="flex items-center gap-2 max-w-sm mx-auto md:mx-0">
                  <input
                    readOnly
                    value={APP_URL}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-primary-foreground"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-primary-foreground hover:bg-white/10"
                    onClick={() => {
                      navigator.clipboard.writeText(APP_URL);
                      toast.success("Link copied!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="px-5 py-6 md:px-8">
        <div className="mx-auto max-w-5xl flex flex-wrap justify-center gap-4 md:gap-8">
          {TRUST_BADGES.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-primary-foreground/60">
              <badge.icon className="h-4 w-4 text-green-400" />
              {badge.label}
            </div>
          ))}
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
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/10">
              <f.icon className="mb-3 h-8 w-8 text-[hsl(var(--brand-blue-light))]" />
              <h3 className="mb-1 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-primary-foreground/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold mb-2 md:text-3xl">Trusted by Parents Worldwide</h2>
          <p className="text-center text-primary-foreground/50 text-sm mb-8">Real reviews from real families across 190+ countries</p>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-primary-foreground/80 mb-3 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t.name}</span>
                  <span className="text-xs text-primary-foreground/40">{t.country}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-3 md:text-3xl">Start Monitoring in Under 60 Seconds</h2>
          <p className="text-primary-foreground/50 text-sm mb-6">No hardware needed. Just your phone. Works on any Android device.</p>
          <Button size="lg" className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white text-base font-semibold px-10 touch-target" onClick={() => navigate("/signup")}>
            {t("landing.startFree")}
          </Button>
        </div>
      </section>

      <CopyrightFooter variant="light" />
    </div>
  );
};

export default Landing;
