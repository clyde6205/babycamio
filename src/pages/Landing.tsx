import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Shield, Video, Wifi, WifiOff, Volume2, Bell, Download, CheckCircle2, Globe, Copy, Smartphone, Zap, Eye, LockKeyhole } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import heroImage from "@/assets/babycam-hero-lite.jpg";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CopyrightFooter from "@/components/CopyrightFooter";
import { AnimateOnScroll } from "@/hooks/use-scroll-animate";

const APP_URL = "https://babycam.io";

const TRUST_BADGES = [
  { icon: LockKeyhole, label: "Private viewer links" },
  { icon: Shield, label: "Signed payment webhooks" },
  { icon: Globe, label: "Works worldwide" },
  { icon: CheckCircle2, label: "Owner-controlled sharing" },
];

const HOW_IT_WORKS = [
  { icon: Download, step: "1", title: "Install the App", desc: "Scan the QR code or visit babycam.io — installs in seconds, no app store needed." },
  { icon: Video, step: "2", title: "Point Your Camera", desc: "Place your phone near your baby's crib and tap 'Start Camera'. That's it." },
  { icon: Eye, step: "3", title: "Monitor From Anywhere", desc: "Watch live from any device — your partner's phone, tablet, or computer." },
];

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen brand-gradient text-primary-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Video className="h-7 w-7 shrink-0 text-[hsl(var(--brand-blue-light))]" />
          <span className="truncate text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-[hsl(var(--brand-blue-light))]">Cam</span>.io
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <LanguageSwitcher variant="light" />
          <Button variant="ghost" size="sm" className="touch-target text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground" onClick={() => navigate("/pricing")}>
            {t("landing.pricing")}
          </Button>
          <Button variant="ghost" size="sm" className="touch-target text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground" onClick={() => navigate("/login")}>
            {t("landing.login")}
          </Button>
          <Button size="sm" className="touch-target bg-[hsl(var(--brand-blue))] text-white hover:bg-[hsl(var(--brand-blue-light))]" onClick={() => navigate("/signup")}>
            {t("landing.getStarted")}
          </Button>
        </div>
      </header>

      <section className="px-5 pb-6 pt-8 md:px-8 md:pt-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={heroImage}
              alt="BabyCam.io monitoring on phones and tablets"
              className="h-auto w-full"
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
            <Button size="lg" className="touch-target bg-[hsl(var(--brand-blue))] px-8 text-base font-semibold text-white hover:bg-[hsl(var(--brand-blue-light))]" onClick={() => navigate("/signup")}>
              {t("landing.startFree")}
            </Button>
            <Button size="lg" variant="outline" className="touch-target border-white/20 text-base text-primary-foreground hover:bg-white/10" onClick={() => navigate("/login")}>
              {t("landing.signIn")}
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-primary-foreground/50">
            <div className="flex items-center gap-1.5">
              <LockKeyhole className="h-4 w-4" />
              <span>Private, owner-controlled camera links</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" />
              <span>Runs on modern phones, tablets, and browsers</span>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            <div className="flex flex-col items-center gap-6 md:flex-row md:gap-10">
              <div className="shrink-0">
                <div className="rounded-2xl bg-white p-4 shadow-lg">
                  <QRCodeSVG value={APP_URL} size={180} />
                </div>
              </div>
              <div className="space-y-3 text-center md:text-left">
                <div className="flex items-center justify-center gap-2 md:justify-start">
                  <Smartphone className="h-5 w-5 text-[hsl(var(--brand-blue-light))]" />
                  <h3 className="text-xl font-bold">Install on Your Phone</h3>
                </div>
                <p className="max-w-sm text-sm text-primary-foreground/60">
                  Scan this QR code with your phone camera to open BabyCam.io, then install it as an app.
                </p>
                <div className="mx-auto flex max-w-sm items-center gap-2 md:mx-0">
                  <input readOnly value={APP_URL} className="min-h-11 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-primary-foreground" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 border-white/20 text-primary-foreground hover:bg-white/10"
                    onClick={() => {
                      navigator.clipboard.writeText(APP_URL);
                      toast.success("Link copied!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <a
                  href="https://play.google.com/store/apps/details?id=io.babycam.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block"
                >
                  <img
                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                    alt="Get it on Google Play"
                    className="h-14"
                    loading="lazy"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Video — DO NOT MODIFY THIS SECTION */}
      <section className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-2 text-2xl font-bold md:text-3xl">See BabyCam.io in Action</h2>
          <p className="mb-6 text-sm text-primary-foreground/50">Watch how easy it is to set up and start monitoring</p>
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <video className="h-auto w-full" controls autoPlay muted loop playsInline preload="metadata" poster={heroImage}>
              <source src="/videos/babycam-launch.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      <AnimateOnScroll>
        <section className="px-5 py-6 md:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4 md:gap-8">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-primary-foreground/60">
                <badge.icon className="h-4 w-4 text-green-400" />
                {badge.label}
              </div>
            ))}
          </div>
        </section>
      </AnimateOnScroll>

      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">How It Works</h2>
            <p className="mb-10 text-center text-sm text-primary-foreground/50">Up and running in under 60 seconds — no hardware required</p>
            <div className="grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((item, index) => (
                <AnimateOnScroll key={item.step} delay={index * 0.15}>
                  <div className="relative rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--brand-blue))] text-white">
                      <item.icon className="h-7 w-7" />
                    </div>
                    <div className="absolute right-4 top-4 text-3xl font-black text-white/10">{item.step}</div>
                    <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-primary-foreground/60">{item.desc}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">Powerful Features</h2>
            <p className="mb-10 text-center text-sm text-primary-foreground/50">Everything you need in a baby monitor</p>
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {[
                { icon: Wifi, title: t("landing.multiNetwork"), desc: t("landing.multiNetworkDesc") },
                { icon: WifiOff, title: t("landing.audioFallback"), desc: t("landing.audioFallbackDesc") },
                { icon: Shield, title: "Private live access", desc: "Viewer links use unguessable room identifiers, while streaming access is checked by the server." },
                { icon: Volume2, title: t("landing.twoWayAudio"), desc: t("landing.twoWayAudioDesc") },
                { icon: Bell, title: t("landing.smartAlerts"), desc: t("landing.smartAlertsDesc") },
                { icon: Video, title: "HD live streaming", desc: "Adaptive video quality helps the stream stay usable on changing networks." },
              ].map((feature, index) => (
                <AnimateOnScroll key={feature.title} delay={index * 0.08}>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/10">
                    <feature.icon className="mb-3 h-8 w-8 text-[hsl(var(--brand-blue-light))]" />
                    <h3 className="mb-1 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-primary-foreground/60">{feature.desc}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">Simple, Transparent Pricing</h2>
            <p className="mb-8 text-center text-sm text-primary-foreground/50">Start free, upgrade when you're ready</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="mb-1 text-lg font-bold">Free</h3>
                <p className="mb-4 text-3xl font-extrabold">$0 <span className="text-sm font-normal text-primary-foreground/50">forever</span></p>
                <ul className="space-y-2 text-sm text-primary-foreground/70">
                  {["1 camera room", "HD streaming", "Motion alerts", "Audio fallback", "Ad-supported"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full bg-white/10 text-primary-foreground hover:bg-white/20" onClick={() => navigate("/signup")}>
                  Get Started Free
                </Button>
              </div>
              <div className="relative rounded-xl border-2 border-[hsl(var(--brand-blue))] bg-white/5 p-6 backdrop-blur-sm">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(var(--brand-blue))] px-3 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </div>
                <h3 className="mb-1 text-lg font-bold">Pro</h3>
                <p className="mb-4 text-3xl font-extrabold">$10.97<span className="text-sm font-normal text-primary-foreground/50">/month</span></p>
                <ul className="space-y-2 text-sm text-primary-foreground/70">
                  {["Up to 10 camera rooms", "Higher-quality streaming", "AI cry detection", "Two-way audio", "No ads", "Multi-viewer sharing"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Zap className="h-4 w-4 shrink-0 text-[hsl(var(--brand-blue-light))]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full bg-[hsl(var(--brand-blue))] font-semibold text-white hover:bg-[hsl(var(--brand-blue-light))]" onClick={() => navigate("/pricing")}>
                  View Pro
                </Button>
              </div>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">Start Monitoring in Under 60 Seconds</h2>
            <p className="mb-6 text-sm text-primary-foreground/50">No hardware needed. Just your phone and a private viewer link.</p>
            <Button size="lg" className="touch-target bg-[hsl(var(--brand-blue))] px-10 text-base font-semibold text-white hover:bg-[hsl(var(--brand-blue-light))]" onClick={() => navigate("/signup")}>
              {t("landing.startFree")}
            </Button>
          </div>
        </section>
      </AnimateOnScroll>

      <CopyrightFooter variant="light" />
    </div>
  );
};

export default Landing;
