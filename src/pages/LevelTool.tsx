import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crosshair } from "lucide-react";

const LevelTool = () => {
  const navigate = useNavigate();
  const [beta, setBeta] = useState(0); // front-back tilt
  const [gamma, setGamma] = useState(0); // left-right tilt
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const requestPermission = async () => {
    const DOE = (DeviceOrientationEvent as any);
    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        setPermission(result === "granted" ? "granted" : "denied");
      } catch {
        setPermission("denied");
      }
    } else {
      setPermission("granted");
    }
  };

  useEffect(() => {
    if (permission !== "granted") return;

    const handler = (e: DeviceOrientationEvent) => {
      setBeta(e.beta ?? 0);
      setGamma(e.gamma ?? 0);
    };

    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [permission]);

  // Draw level bubble
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const maxOffset = center - 30;

    ctx.clearRect(0, 0, size, size);

    // Outer ring
    ctx.beginPath();
    ctx.arc(center, center, center - 10, 0, Math.PI * 2);
    ctx.strokeStyle = "hsl(220, 15%, 88%)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cross hairs
    ctx.beginPath();
    ctx.moveTo(center - 15, center);
    ctx.lineTo(center + 15, center);
    ctx.moveTo(center, center - 15);
    ctx.lineTo(center, center + 15);
    ctx.strokeStyle = "hsl(220, 10%, 46%)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clamp bubble position
    const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
    const bx = center + clamp(gamma * 2, maxOffset);
    const by = center + clamp(beta * 2, maxOffset);

    // Is level?
    const isLevel = Math.abs(beta) < 1.5 && Math.abs(gamma) < 1.5;

    // Bubble
    ctx.beginPath();
    ctx.arc(bx, by, 20, 0, Math.PI * 2);
    ctx.fillStyle = isLevel
      ? "hsla(142, 71%, 45%, 0.8)"
      : "hsla(213, 70%, 55%, 0.7)";
    ctx.fill();
    ctx.strokeStyle = isLevel
      ? "hsl(142, 71%, 45%)"
      : "hsl(213, 70%, 55%)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [beta, gamma]);

  const isLevel = Math.abs(beta) < 1.5 && Math.abs(gamma) < 1.5;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <button onClick={() => navigate("/dashboard")} className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Crosshair className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Level Tool
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-1">Spirit Level</h1>
        <p className="text-sm text-muted-foreground mb-8">Place your phone on any surface to check if it's level.</p>

        {permission === "prompt" ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Crosshair className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-center text-muted-foreground text-sm">
              This tool uses your device's motion sensors to detect tilt.
            </p>
            <Button onClick={requestPermission} className="touch-target">
              Enable Sensors
            </Button>
          </div>
        ) : permission === "denied" ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-muted-foreground text-sm">
              Sensor access was denied. Please enable motion sensors in your device settings and refresh.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh
            </Button>
          </div>
        ) : (
          <>
            {/* Level canvas */}
            <div className="relative mb-6">
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                className="rounded-full border-2 border-border"
              />
            </div>

            {/* Status */}
            <div className={`rounded-xl px-6 py-3 text-center font-bold text-lg ${
              isLevel
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {isLevel ? "✓ LEVEL" : "NOT LEVEL"}
            </div>

            {/* Readings */}
            <div className="mt-6 grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tilt (F/B)</p>
                <p className="text-xl font-mono font-bold">{beta.toFixed(1)}°</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tilt (L/R)</p>
                <p className="text-xl font-mono font-bold">{gamma.toFixed(1)}°</p>
              </div>
            </div>

            <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
              Accuracy depends on your device's sensors. Calibrate by placing on a known level surface.
            </p>
          </>
        )}
      </main>

      <footer className="border-t px-5 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BabyCam.io™ — All Rights Reserved.
      </footer>
    </div>
  );
};

export default LevelTool;
