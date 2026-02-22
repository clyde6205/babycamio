import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeartbeatOptions {
  roomName: string;
  userId: string | null;
  isConnected: boolean;
  networkQuality: string;
  streamActive: boolean;
  intervalMs?: number;
}

export function useCameraHeartbeat({
  roomName,
  userId,
  isConnected,
  networkQuality,
  streamActive,
  intervalMs = 30000,
}: HeartbeatOptions) {
  const intervalRef = useRef<number | null>(null);
  const batteryRef = useRef<number | null>(null);
  const networkTypeRef = useRef<string>("unknown");

  // Get battery info
  useEffect(() => {
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryRef.current = Math.round(battery.level * 100);
        battery.addEventListener("levelchange", () => {
          batteryRef.current = Math.round(battery.level * 100);
        });
      });
    }
    // Get network type
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      networkTypeRef.current = conn.effectiveType || conn.type || "unknown";
      conn.addEventListener?.("change", () => {
        networkTypeRef.current = conn.effectiveType || conn.type || "unknown";
      });
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!userId || !roomName) return;

    const status = !isConnected
      ? "disconnected"
      : networkQuality === "poor" || networkQuality === "offline"
      ? "degraded"
      : "healthy";

    try {
      await supabase.from("camera_heartbeats").upsert(
        {
          user_id: userId,
          room_name: roomName,
          status,
          battery_level: batteryRef.current,
          network_type: networkTypeRef.current,
          network_quality: networkQuality,
          stream_active: streamActive,
          last_heartbeat: new Date().toISOString(),
        },
        { onConflict: "user_id,room_name" }
      );
    } catch (err) {
      console.warn("[Heartbeat] Failed to send:", err);
    }
  }, [userId, roomName, isConnected, networkQuality, streamActive]);

  // Send heartbeat on connection changes immediately
  useEffect(() => {
    if (userId && roomName) {
      sendHeartbeat();
    }
  }, [isConnected, networkQuality, sendHeartbeat]);

  // Periodic heartbeat
  useEffect(() => {
    if (!userId || !roomName || !isConnected) return;

    intervalRef.current = window.setInterval(sendHeartbeat, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId, roomName, isConnected, sendHeartbeat, intervalMs]);

  // Mark disconnected on unmount
  useEffect(() => {
    return () => {
      if (userId && roomName) {
        supabase.from("camera_heartbeats").upsert(
          {
            user_id: userId,
            room_name: roomName,
            status: "disconnected",
            stream_active: false,
            last_heartbeat: new Date().toISOString(),
          },
          { onConflict: "user_id,room_name" }
        ).then(() => {});
      }
    };
  }, [userId, roomName]);

  return { sendHeartbeat };
}
