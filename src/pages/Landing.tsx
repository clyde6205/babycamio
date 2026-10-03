import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Shield, Video, Wifi, WifiOff, Volume2, Bell, Star, Download, CheckCircle2, Globe, Copy, Smartphone, Zap, Eye, MonitorSmartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import heroImage from "@/assets/babycam-hero-optimized.webp";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CopyrightFooter from "@/components/CopyrightFooter";
import { AnimateOnScroll } from "@/hooks/use-scroll-animate";
import AnimatedCounter from "@/components/AnimatedCounter";

const APP_URL = "https://babycam.io"; // install link

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
            <Button size="lg" className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white text-base font-semibold px-8 touch-target" onClick={() => navigate("/signup")}>
              {t("landing.startFree")}
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-primary-foreground hover:bg-white/10 text-base touch-target" onClick={() => navigate("/login")}>
              {t("landing.signIn")}
            </Button>
          </div>

          {/* Animated Stats */}
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-primary-foreground/50">
            <div className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              <span><AnimatedCounter end={50000} suffix="+" /> families worldwide</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              <span><AnimatedCounter end={190} suffix="+" /> countries</span>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1">4.8/5 rating</span>
            </div>
          </div>

          {/* Google Play Badge + QR Code Install Section */}
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
                {/* Google Play Badge */}
                <a
                  href="https://play.google.com/store/apps/details?id=io.babycam.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2"
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
          <h2 className="text-2xl font-bold mb-2 md:text-3xl">See BabyCam.io in Action</h2>
          <p className="text-primary-foreground/50 text-sm mb-6">Watch how easy it is to set up and start monitoring</p>
          <div className="overflow-hidden rounded-2xl shadow-2xl border border-white/10">
            <video
              className="w-full h-auto"
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={heroImage}
            >
              <source src="/videos/babycam-launch.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <AnimateOnScroll>
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
      </AnimateOnScroll>

      {/* How it Works */}
      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold mb-2 md:text-3xl">How It Works</h2>
            <p className="text-center text-primary-foreground/50 text-sm mb-10">Up and running in under 60 seconds — no hardware required</p>
            <div className="grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((item, i) => (
                <AnimateOnScroll key={i} delay={i * 0.15}>
                  <div className="relative rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--brand-blue))] text-white">
                      <item.icon className="h-7 w-7" />
                    </div>
                    <div className="absolute top-4 right-4 text-3xl font-black text-white/10">{item.step}</div>
                    <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-primary-foreground/60">{item.desc}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* Features */}
      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold mb-2 md:text-3xl">Powerful Features</h2>
            <p className="text-center text-primary-foreground/50 text-sm mb-10">Everything you need in a professional baby monitor</p>
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {[
                { icon: Wifi, title: t("landing.multiNetwork"), desc: t("landing.multiNetworkDesc") },
                { icon: WifiOff, title: t("landing.audioFallback"), desc: t("landing.audioFallbackDesc") },
                { icon: Shield, title: t("landing.e2eSecure"), desc: t("landing.e2eSecureDesc") },
                { icon: Volume2, title: t("landing.twoWayAudio"), desc: t("landing.twoWayAudioDesc") },
                { icon: Bell, title: t("landing.smartAlerts"), desc: t("landing.smartAlertsDesc") },
                { icon: Video, title: t("landing.hdStreaming"), desc: t("landing.hdStreamingDesc") },
              ].map((f, i) => (
                <AnimateOnScroll key={i} delay={i * 0.08}>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/10">
                    <f.icon className="mb-3 h-8 w-8 text-[hsl(var(--brand-blue-light))]" />
                    <h3 className="mb-1 text-lg font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-primary-foreground/60">{f.desc}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* Pricing Preview */}
      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold mb-2 md:text-3xl">Simple, Transparent Pricing</h2>
            <p className="text-center text-primary-foreground/50 text-sm mb-8">Start free, upgrade when you're ready</p>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Free Plan */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="text-lg font-bold mb-1">Free</h3>
                <p className="text-3xl font-extrabold mb-4">$0 <span className="text-sm font-normal text-primary-foreground/50">forever</span></p>
                <ul className="space-y-2 text-sm text-primary-foreground/70">
                  {["1 camera room", "720p HD streaming", "Basic motion alerts", "Audio fallback", "Ad-supported"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6 bg-white/10 hover:bg-white/20 text-primary-foreground" onClick={() => navigate("/signup")}>
                  Get Started Free
                </Button>
              </div>
              {/* Pro Plan */}
              <div className="rounded-xl border-2 border-[hsl(var(--brand-blue))] bg-white/5 p-6 backdrop-blur-sm relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[hsl(var(--brand-blue))] text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
                <h3 className="text-lg font-bold mb-1">Pro</h3>
                <p className="text-3xl font-extrabold mb-4">$9.97<span className="text-sm font-normal text-primary-foreground/50">/month</span></p>
                <ul className="space-y-2 text-sm text-primary-foreground/70">
                  {["Unlimited rooms", "4K Ultra HD streaming", "AI cry detection", "Two-way audio", "No ads", "Multi-viewer sharing", "Priority 24/7 support"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[hsl(var(--brand-blue-light))] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6 bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white font-semibold" onClick={() => navigate("/pricing")}>
                  Start Pro Trial
                </Button>
              </div>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* Testimonials */}
      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold mb-2 md:text-3xl">Trusted by Parents Worldwide</h2>
            <p className="text-center text-primary-foreground/50 text-sm mb-8">Real reviews from real families across 190+ countries</p>
            <div className="grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((testimonial, i) => (
                <AnimateOnScroll key={i} delay={i * 0.1}>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: testimonial.stars }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-primary-foreground/80 mb-3 leading-relaxed">"{testimonial.text}"</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{testimonial.name}</span>
                      <span className="text-xs text-primary-foreground/40">{testimonial.country}</span>
                    </div>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* CTA */}
      <AnimateOnScroll>
        <section className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold mb-3 md:text-3xl">Start Monitoring in Under 60 Seconds</h2>
            <p className="text-primary-foreground/50 text-sm mb-6">No hardware needed. Just your phone. Works on any device.</p>
            <Button size="lg" className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white text-base font-semibold px-10 touch-target" onClick={() => navigate("/signup")}>
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
