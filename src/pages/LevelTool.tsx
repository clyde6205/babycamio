import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crosshair } from "lucide-react";

const LevelTool = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [beta, setBeta] = useState(0);
  const [gamma, setGamma] = useState(0);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const requestPermission = async () => {
    const DOE = (DeviceOrientationEvent as any);
    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        setPermission(result === "granted" ? "granted" : "denied");
      } catch { setPermission("denied"); }
    } else { setPermission("granted"); }
  };

  useEffect(() => {
    if (permission !== "granted") return;
    const handler = (e: DeviceOrientationEvent) => { setBeta(e.beta ?? 0); setGamma(e.gamma ?? 0); };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [permission]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const center = size / 2;
    const maxOffset = center - 30;
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath(); ctx.arc(center, center, center - 10, 0, Math.PI * 2); ctx.strokeStyle = "hsl(220, 15%, 88%)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(center - 15, center); ctx.lineTo(center + 15, center); ctx.moveTo(center, center - 15); ctx.lineTo(center, center + 15); ctx.strokeStyle = "hsl(220, 10%, 46%)"; ctx.lineWidth = 1; ctx.stroke();
    const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
    const bx = center + clamp(gamma * 2, maxOffset);
    const by = center + clamp(beta * 2, maxOffset);
    const isLvl = Math.abs(beta) < 1.5 && Math.abs(gamma) < 1.5;
    ctx.beginPath(); ctx.arc(bx, by, 20, 0, Math.PI * 2);
    ctx.fillStyle = isLvl ? "hsla(142, 71%, 45%, 0.8)" : "hsla(213, 70%, 55%, 0.7)"; ctx.fill();
    ctx.strokeStyle = isLvl ? "hsl(142, 71%, 45%)" : "hsl(213, 70%, 55%)"; ctx.lineWidth = 2; ctx.stroke();
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
            {t("levelTool.title")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-1">{t("levelTool.spiritLevel")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("levelTool.desc")}</p>

        {permission === "prompt" ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Crosshair className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-center text-muted-foreground text-sm">{t("levelTool.sensorDesc")}</p>
            <Button onClick={requestPermission} className="touch-target">{t("levelTool.enableSensors")}</Button>
          </div>
        ) : permission === "denied" ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-muted-foreground text-sm">{t("levelTool.sensorDenied")}</p>
            <Button onClick={() => window.location.reload()} variant="outline">{t("levelTool.refresh")}</Button>
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <canvas ref={canvasRef} width={280} height={280} className="rounded-full border-2 border-border" />
            </div>
            <div className={`rounded-xl px-6 py-3 text-center font-bold text-lg ${isLevel ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
              {isLevel ? t("levelTool.level") : t("levelTool.notLevel")}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("levelTool.tiltFB")}</p>
                <p className="text-xl font-mono font-bold">{beta.toFixed(1)}°</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("levelTool.tiltLR")}</p>
                <p className="text-xl font-mono font-bold">{gamma.toFixed(1)}°</p>
              </div>
            </div>
            <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">{t("levelTool.calibrationNote")}</p>
          </>
        )}
      </main>

      <footer className="border-t px-5 py-4 text-center text-xs text-muted-foreground">
        {t("common.copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
};

export default LevelTool;
