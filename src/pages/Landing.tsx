import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Video, Wifi, WifiOff, Volume2, Bell } from "lucide-react";
import heroImage from "@/assets/babycam-hero.png";

const Landing = () => {
  const navigate = useNavigate();

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
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 touch-target"
            onClick={() => navigate("/pricing")}
          >
            Pricing
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 touch-target"
            onClick={() => navigate("/login")}
          >
            Log in
          </Button>
          <Button
            size="sm"
            className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white touch-target"
            onClick={() => navigate("/signup")}
          >
            Get Started
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
              loading="eager"
            />
          </div>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Professional <span className="text-brand-gradient">Baby Monitoring</span>
            <br />Built for Every Connection
          </h1>
          <p className="mb-8 max-w-xl text-base leading-relaxed text-primary-foreground/70 md:text-lg">
            Enterprise-grade live video streaming that works on Wi-Fi, mobile data, or local networks. 
            Optimized for Android devices worldwide — even on low bandwidth.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white text-base font-semibold px-8 touch-target"
              onClick={() => navigate("/signup")}
            >
              Start Monitoring Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-primary-foreground hover:bg-white/10 text-base touch-target"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3 md:gap-6">
          {[
            {
              icon: Wifi,
              title: "Multi-Network",
              desc: "Seamlessly switches between Wi-Fi, mobile data, and local connections. Works on 2G/3G/4G/5G.",
            },
            {
              icon: WifiOff,
              title: "Audio Fallback",
              desc: "Automatically drops to audio-only on low bandwidth. Never lose connection to your baby.",
            },
            {
              icon: Shield,
              title: "End-to-End Secure",
              desc: "Encrypted video rooms with token-based access. Only authorized viewers can connect.",
            },
            {
              icon: Volume2,
              title: "Two-Way Audio",
              desc: "Talk back to soothe your baby. Crystal-clear audio optimized for low-end devices.",
            },
            {
              icon: Bell,
              title: "Smart Alerts",
              desc: "Cry detection and motion alerts sent instantly to all connected devices.",
            },
            {
              icon: Video,
              title: "HD Streaming",
              desc: "Adaptive bitrate streaming — HD when bandwidth allows, reliable when it doesn't.",
            },
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

      {/* Disclaimer banner */}
      <section className="px-5 md:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm">
          <p className="text-xs text-primary-foreground/40 leading-relaxed">
            <strong className="text-primary-foreground/60">Important:</strong> BabyCam.io is a monitoring tool and is not a substitute for 
            in-person supervision of children. See our{" "}
            <button onClick={() => navigate("/disclaimer")} className="text-[hsl(var(--brand-blue-light))] underline">
              full disclaimer
            </button>{" "}
            for details.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-5 py-6 mt-12">
        <div className="mx-auto max-w-5xl flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <p className="text-sm text-primary-foreground/40">
            © {new Date().getFullYear()} BabyCam.io™ — All Rights Reserved.
          </p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/terms")} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 underline">
              Terms of Service
            </button>
            <button onClick={() => navigate("/privacy")} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 underline">
              Privacy Policy
            </button>
            <button onClick={() => navigate("/disclaimer")} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 underline">
              Disclaimer
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
