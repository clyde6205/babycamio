import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Download, Smartphone, CheckCircle2, ArrowLeft, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const APP_URL = "https://babycamio.lovable.app";

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-[100dvh] brand-gradient text-primary-foreground">
      <header className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => navigate("/")} className="touch-target">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-[hsl(var(--brand-blue-light))]" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-[hsl(var(--brand-blue-light))]">Cam</span>.io
          </span>
        </div>
      </header>

      <main className="px-5 py-10 max-w-md mx-auto text-center space-y-6">
        {isInstalled ? (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/20 mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Already Installed! ✓</h1>
            <p className="text-primary-foreground/60">BabyCam.io is on your home screen. Open it from there for the best experience.</p>
            <Button onClick={() => navigate("/dashboard")} className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white touch-target">
              Go to Dashboard
            </Button>
          </>
        ) : (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[hsl(var(--brand-blue))]/20 mx-auto">
              <Download className="h-10 w-10 text-[hsl(var(--brand-blue-light))]" />
            </div>
            <h1 className="text-2xl font-bold">Install BabyCam.io</h1>
            <p className="text-primary-foreground/60">Add to your home screen for instant access — no app store needed.</p>

            {deferredPrompt ? (
              <Button
                size="lg"
                onClick={handleInstall}
                className="bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white text-base font-semibold px-10 touch-target w-full"
              >
                <Download className="mr-2 h-5 w-5" /> Install Now
              </Button>
            ) : isIOS ? (
              <Card className="p-5 bg-white/5 border-white/10 text-left space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> How to install on iPhone/iPad:
                </p>
                <ol className="text-sm text-primary-foreground/70 space-y-2 list-decimal list-inside">
                  <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> to confirm</li>
                </ol>
              </Card>
            ) : (
              <Card className="p-5 bg-white/5 border-white/10 text-left space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> How to install on Android:
                </p>
                <ol className="text-sm text-primary-foreground/70 space-y-2 list-decimal list-inside">
                  <li>Tap the <strong>⋮ menu</strong> (three dots) in your browser</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Install"</strong> to confirm</li>
                </ol>
              </Card>
            )}

            <div className="space-y-2 text-left">
              <p className="text-xs font-semibold text-primary-foreground/50 uppercase tracking-wider">Why install?</p>
              {[
                "Opens instantly like a native app",
                "Works offline and on slow connections",
                "Full-screen experience — no browser bars",
                "Push notifications for alerts",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-primary-foreground/70">
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>

            {/* QR Code & Share Link */}
            <Card className="p-5 bg-white/5 border-white/10 space-y-4">
              <p className="text-sm font-semibold">Scan to install on any phone:</p>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={APP_URL} size={180} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={APP_URL}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-primary-foreground"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-primary-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(APP_URL);
                    toast.success("Link copied!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {navigator.share && (
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-primary-foreground"
                  onClick={() => navigator.share({ title: "BabyCam.io", text: "Install BabyCam.io - Professional baby monitoring", url: APP_URL })}
                >
                  Share Link
                </Button>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default InstallApp;
