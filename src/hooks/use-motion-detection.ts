import { useEffect, useRef, useState, useCallback } from "react";

export interface MotionDetectionOptions {
  /** Sensitivity threshold 0-255, lower = more sensitive. Default 25 */
  threshold?: number;
  /** Minimum % of pixels that must change to trigger motion. Default 1.5 */
  minMotionPercent?: number;
  /** How often to sample frames in ms. Default 300 */
  sampleInterval?: number;
  /** Cooldown ms after motion detected before re-triggering. Default 3000 */
  cooldown?: number;
}

export interface MotionDetectionResult {
  isMotionDetected: boolean;
  motionLevel: number; // 0-100 percent of changed pixels
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  lastMotionAt: number | null;
}

/**
 * Detects motion by comparing consecutive video frames via canvas pixel differencing.
 * Runs entirely on-device — no server calls.
 */
export function useMotionDetection(
  videoElement: HTMLVideoElement | null,
  options: MotionDetectionOptions = {}
): MotionDetectionResult {
  const {
    threshold = 25,
    minMotionPercent = 1.5,
    sampleInterval = 300,
    cooldown = 3000,
  } = options;

  const [enabled, setEnabled] = useState(true);
  const [isMotionDetected, setIsMotionDetected] = useState(false);
  const [motionLevel, setMotionLevel] = useState(0);
  const [lastMotionAt, setLastMotionAt] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const cooldownRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const analyse = useCallback(() => {
    if (!videoElement || videoElement.readyState < 2 || !enabled) return;

    const w = 160; // analyse at low res for perf
    const h = 120;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      ctxRef.current = canvasRef.current.getContext("2d", { willReadFrequently: true });
    }

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.drawImage(videoElement, 0, 0, w, h);
    const currentFrame = ctx.getImageData(0, 0, w, h);

    if (!prevFrameRef.current) {
      prevFrameRef.current = currentFrame;
      return;
    }

    const prev = prevFrameRef.current.data;
    const curr = currentFrame.data;
    const totalPixels = w * h;
    let changedPixels = 0;

    for (let i = 0; i < prev.length; i += 4) {
      const dr = Math.abs(curr[i] - prev[i]);
      const dg = Math.abs(curr[i + 1] - prev[i + 1]);
      const db = Math.abs(curr[i + 2] - prev[i + 2]);
      if ((dr + dg + db) / 3 > threshold) {
        changedPixels++;
      }
    }

    const percent = (changedPixels / totalPixels) * 100;
    setMotionLevel(Math.round(percent * 10) / 10);

    if (percent >= minMotionPercent && !cooldownRef.current) {
      setIsMotionDetected(true);
      setLastMotionAt(Date.now());
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
        setIsMotionDetected(false);
      }, cooldown);
    }

    prevFrameRef.current = currentFrame;
  }, [videoElement, enabled, threshold, minMotionPercent, cooldown]);

  useEffect(() => {
    if (!enabled || !videoElement) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      prevFrameRef.current = null;
      setMotionLevel(0);
      setIsMotionDetected(false);
      return;
    }

    intervalRef.current = window.setInterval(analyse, sampleInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, videoElement, analyse, sampleInterval]);

  return { isMotionDetected, motionLevel, enabled, setEnabled, lastMotionAt };
}
