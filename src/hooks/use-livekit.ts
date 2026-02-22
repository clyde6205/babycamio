import { useState, useCallback, useRef, useEffect } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  VideoPresets,
  RoomOptions,
  DisconnectReason,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";

export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "offline";
export type ConnectionType = "wifi" | "cellular" | "bluetooth" | "ethernet" | "unknown" | "offline";

interface UseLiveKitOptions {
  roomName: string;
  participantName: string;
  isPublisher: boolean;
}

interface UseLiveKitReturn {
  room: Room | null;
  connectionState: ConnectionState;
  networkQuality: NetworkQuality;
  connectionType: ConnectionType;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  retry: () => Promise<void>;
  audioOnly: boolean;
}

// ─── Connection type detection (WiFi / Cellular / Bluetooth / Ethernet) ────
const getConnectionType = (): ConnectionType => {
  if (!navigator.onLine) return "offline";
  const nav = navigator as any;
  if (!nav.connection) return "unknown";
  const type = nav.connection.type;
  // Android reports: wifi, cellular, bluetooth, ethernet, none, other, unknown
  if (type === "wifi") return "wifi";
  if (type === "cellular") return "cellular";
  if (type === "bluetooth") return "bluetooth";
  if (type === "ethernet") return "ethernet"; // USB tethering also shows as ethernet
  return "unknown";
};

// ─── Network quality from effectiveType + connection type ──────────
const getNetworkQuality = (): NetworkQuality => {
  if (!navigator.onLine) return "offline";
  const nav = navigator as any;
  if (!nav.connection) return "good";

  const connType = getConnectionType();
  const effectiveType = nav.connection.effectiveType;
  const downlink = nav.connection.downlink; // Mbps estimate

  // Bluetooth tethering is typically slower — cap at "good"
  if (connType === "bluetooth") {
    if (downlink && downlink >= 2) return "good";
    if (downlink && downlink >= 0.5) return "fair";
    return "poor";
  }

  // Use effectiveType + downlink for best estimate
  if (effectiveType === "4g" && downlink >= 5) return "excellent";
  if (effectiveType === "4g") return "good";
  if (effectiveType === "3g") return "good";
  if (effectiveType === "2g") return "fair";
  if (effectiveType === "slow-2g") return "poor";

  // Fallback: use downlink speed if available
  if (downlink !== undefined) {
    if (downlink >= 5) return "excellent";
    if (downlink >= 2) return "good";
    if (downlink >= 0.5) return "fair";
    return "poor";
  }

  return "good";
};

// ─── Room options adapted per quality + connection type ────────────
const getRoomOptions = (quality: NetworkQuality, isPublisher: boolean, connType: ConnectionType): RoomOptions => {
  const base: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    disconnectOnPageLeave: false, // We manage lifecycle manually for persistence
    reconnectPolicy: {
      nextRetryDelayInMs: (context) => {
        const isMobile = connType === "cellular" || connType === "bluetooth";
        const baseDelay = isMobile ? 200 : 300;
        const maxDelay = isMobile ? 5000 : 8000;
        const maxRetries = 100; // Effectively never give up
        const delay = Math.min(baseDelay * Math.pow(1.3, context.retryCount), maxDelay);
        return context.retryCount < maxRetries ? delay : null;
      },
    },
  };

  if (!isPublisher) return base;

  // Quality presets for publishers
  const presets: Record<string, Partial<RoomOptions>> = {
    excellent: {
      videoCaptureDefaults: { resolution: { width: 3840, height: 2160, frameRate: 30 } },
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h2160, VideoPresets.h1080, VideoPresets.h720, VideoPresets.h360],
        videoCodec: "vp8", dtx: true, red: true,
      },
    },
    good: {
      videoCaptureDefaults: { resolution: { width: 1920, height: 1080, frameRate: 24 } },
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h720, VideoPresets.h360],
        videoCodec: "vp8", dtx: true, red: true,
      },
    },
    fair: {
      videoCaptureDefaults: { resolution: { width: 640, height: 480, frameRate: 15 } },
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h180],
        videoCodec: "vp8", dtx: true, red: true,
      },
    },
    poor: {
      videoCaptureDefaults: { resolution: { width: 320, height: 240, frameRate: 10 } },
      publishDefaults: { videoCodec: "vp8", dtx: true, red: true },
    },
    offline: {
      videoCaptureDefaults: { resolution: { width: 320, height: 240, frameRate: 5 } },
      publishDefaults: { videoCodec: "vp8", dtx: true, red: true },
    },
  };

  return { ...base, ...presets[quality] || presets.poor };
};

// ─── Token fetcher with retry ──────────────────────────────────────
const fetchTokenWithRetry = async (
  roomName: string,
  participantName: string,
  isPublisher: boolean,
  maxRetries = 3
): Promise<{ token: string; url: string }> => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* no auth */ }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout — generous for slow networks worldwide

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/livekit-token`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ roomName, participantName, isPublisher }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Token request failed (${response.status})`);
      }

      return await response.json();
    } catch (err: any) {
      lastError = err;
      console.warn(`[LiveKit] Token fetch attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // 2s, 4s, 6s backoff for slow networks
      }
    }
  }

  throw lastError || new Error("Failed to get token after retries");
};

// ─── Wake Lock to keep screen/connection alive on Android ──────────
let wakeLock: any = null;

const requestWakeLock = async () => {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await (navigator as any).wakeLock.request("screen");
      console.log("[LiveKit] Wake lock acquired — screen stays on");
      wakeLock.addEventListener("release", () => {
        console.log("[LiveKit] Wake lock released");
      });
    }
  } catch (e: any) {
    console.warn("[LiveKit] Wake lock failed:", e.message);
  }
};

const releaseWakeLock = () => {
  if (wakeLock) {
    try { wakeLock.release(); } catch { /* ok */ }
    wakeLock = null;
  }
};

// Re-acquire wake lock when page becomes visible again
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wakeLock === null) {
      // Will be re-requested by the hook if active
    }
  });
}

// ─── Main hook ─────────────────────────────────────────────────────
export const useLiveKit = ({
  roomName,
  participantName,
  isPublisher,
}: UseLiveKitOptions): UseLiveKitReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(getNetworkQuality);
  const [connectionType, setConnectionType] = useState<ConnectionType>(getConnectionType);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [roomInstance, setRoomInstance] = useState<Room | null>(null);

  const roomRef = useRef<Room | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const autoReconnectRef = useRef<number | null>(null);
  const qualityCheckRef = useRef<number | null>(null);
  const intentionalDisconnect = useRef(false);
  const connectAttemptRef = useRef(0);
  const lastQualityRef = useRef<NetworkQuality>("good");

  // ── Network monitor: handles WiFi ↔ Cellular ↔ Bluetooth switches ──
  useEffect(() => {
    const nav = navigator as any;
    const update = () => {
      const q = getNetworkQuality();
      const ct = getConnectionType();
      setNetworkQuality(q);
      setConnectionType(ct);

      console.log(`[LiveKit] Network changed: ${ct} / ${q}`);

      if (q === "poor" || q === "offline") {
        setAudioOnly(true);
      } else {
        setAudioOnly(false);
      }

      // If quality improved significantly while connected, re-enable video
      if (roomRef.current?.state === ConnectionState.Connected && isPublisher) {
        const prev = lastQualityRef.current;
        if ((prev === "poor" || prev === "offline") && (q === "good" || q === "excellent")) {
          console.log("[LiveKit] Quality improved — re-enabling video");
          roomRef.current.localParticipant.setCameraEnabled(true).catch(() => {});
          setAudioOnly(false);
        }
        // If quality degraded, switch to audio only
        if ((prev === "excellent" || prev === "good") && q === "poor") {
          console.log("[LiveKit] Quality degraded — switching to audio only");
          roomRef.current.localParticipant.setCameraEnabled(false).catch(() => {});
          setAudioOnly(true);
        }
      }

      lastQualityRef.current = q;
    };

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (nav.connection) nav.connection.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (nav.connection) nav.connection.removeEventListener("change", update);
    };
  }, [isPublisher]);

  // ── Enable devices with cascading fallbacks ──
  const enableDevices = useCallback(async (room: Room, quality: NetworkQuality) => {
    if (!isPublisher) return;

    // Standard device enable — permissions already granted by pre-acquire in connectToRoom

    // Fallback path (no pre-acquired stream, e.g. auto-reconnect)
    try {
      if (quality === "poor" || quality === "offline") {
        await room.localParticipant.setMicrophoneEnabled(true);
        setAudioOnly(true);
      } else {
        await room.localParticipant.enableCameraAndMicrophone();
        setAudioOnly(false);
      }
    } catch (e: any) {
      console.warn("[LiveKit] Device enable failed, trying fallbacks:", e.message);
      try { await room.localParticipant.setCameraEnabled(true); } catch { /* ok */ }
      try { await room.localParticipant.setMicrophoneEnabled(true); } catch { /* ok */ }
    }
  }, [isPublisher]);

  // ── Core connect with full resilience ──
  const connectToRoom = useCallback(async () => {
    if (roomRef.current?.state === ConnectionState.Connected) return;

    setIsConnecting(true);
    setError(null);
    intentionalDisconnect.current = false;
    connectAttemptRef.current += 1;
    const thisAttempt = connectAttemptRef.current;

    // CRITICAL: Pre-acquire camera/mic permissions IMMEDIATELY in the user gesture context
    // This must happen BEFORE any async operations (token fetch, room connect)
    // Otherwise browsers (especially Safari/Android WebView) block getUserMedia silently → black screen
    let preAcquiredStream: MediaStream | undefined;
    if (isPublisher) {
      try {
        console.log("[LiveKit] Pre-acquiring camera/mic permissions (user gesture context)…");
        preAcquiredStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log("[LiveKit] ✅ Camera/mic permissions granted");
      } catch (e: any) {
        console.warn("[LiveKit] Pre-acquire failed, will try later:", e.message);
        // Try video-only
        try {
          preAcquiredStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          // Try audio-only
          try {
            preAcquiredStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          } catch {
            console.warn("[LiveKit] No media devices available");
          }
        }
      }
    }

    try {
      // Wait for network if offline
      if (!navigator.onLine) {
        setError("Waiting for network…");
        setConnectionState(ConnectionState.Disconnected);
        setIsConnecting(false);
        preAcquiredStream?.getTracks().forEach(t => t.stop());
        return;
      }

      const { token, url } = await fetchTokenWithRetry(roomName, participantName, isPublisher);
      const quality = getNetworkQuality();
      const connType = getConnectionType();
      setNetworkQuality(quality);
      setConnectionType(connType);
      lastQualityRef.current = quality;

      // Clean up previous room
      if (roomRef.current) {
        try { roomRef.current.disconnect(true); } catch { /* ok */ }
        roomRef.current = null;
      }

      const room = new Room(getRoomOptions(quality, isPublisher, connType));
      roomRef.current = room;

      // ── Room events ──
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setConnectionState(state);
      });

      room.on(RoomEvent.Reconnecting, () => {
        console.log("[LiveKit] Reconnecting…");
        setConnectionState(ConnectionState.Reconnecting);
        setError(null);
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log("[LiveKit] ✅ Reconnected successfully");
        setConnectionState(ConnectionState.Connected);
        setError(null);
        connectAttemptRef.current = 0;
      });

      room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        console.log("[LiveKit] Disconnected, reason:", reason);
        setConnectionState(ConnectionState.Disconnected);
        setRoomInstance(null);

        if (!intentionalDisconnect.current && thisAttempt === connectAttemptRef.current) {
          setError("Connection lost — reconnecting…");
          scheduleReconnect();
        }
      });

      room.on(RoomEvent.SignalReconnecting, () => setError(null));

      // ── Connect ──
      console.log(`[LiveKit] Connecting via ${connType} (${quality}) to ${url} room: ${roomName}`);
      await room.connect(url, token, {
        rtcConfig: {
          iceTransportPolicy: "all",
          iceCandidatePoolSize: 4,
          bundlePolicy: "max-bundle",
        },
        peerConnectionTimeout: 30000,
        websocketTimeout: 30000,
      });
      console.log("[LiveKit] ✅ Connected! Room:", room.name);

      setConnectionState(ConnectionState.Connected);
      setRoomInstance(room);
      setError(null);
      connectAttemptRef.current = 0;

      // Acquire wake lock to keep screen on (critical for baby monitor)
      await requestWakeLock();

      // Release pre-acquired stream BEFORE LiveKit opens the camera — avoids device lock → black screen
      if (preAcquiredStream) {
        console.log("[LiveKit] Releasing pre-acquired stream before LiveKit device enable");
        preAcquiredStream.getTracks().forEach(t => t.stop());
      }

      // Enable devices — permissions already granted by pre-acquire above
      await enableDevices(room, quality);

      // Start heartbeat
      startHeartbeat(room);

      // Start periodic quality check (adapts mid-stream)
      startQualityCheck();

    } catch (err: any) {
      console.error("[LiveKit] Connection failed:", err.message);
      // Clean up pre-acquired stream on failure
      preAcquiredStream?.getTracks().forEach(t => t.stop());

      if (thisAttempt === connectAttemptRef.current && !intentionalDisconnect.current) {
        setError(err.message || "Failed to connect");
        setConnectionState(ConnectionState.Disconnected);
        scheduleReconnect();
      }
    } finally {
      setIsConnecting(false);
    }
  }, [roomName, participantName, isPublisher, enableDevices]);

  // ── Auto-reconnect with adaptive backoff ──
  const scheduleReconnect = useCallback(() => {
    if (intentionalDisconnect.current) return;
    if (autoReconnectRef.current) clearTimeout(autoReconnectRef.current);

    const connType = getConnectionType();
    // Faster reconnect on cellular/bluetooth (more prone to drops)
    const baseDelay = (connType === "cellular" || connType === "bluetooth") ? 1000 : 2000;
    const delay = Math.min(baseDelay * Math.pow(1.3, Math.min(connectAttemptRef.current, 15)), 30000);

    console.log(`[LiveKit] Auto-reconnect in ${Math.round(delay / 1000)}s (${connType})…`);

    autoReconnectRef.current = window.setTimeout(() => {
      if (!intentionalDisconnect.current) {
        console.log("[LiveKit] Auto-reconnecting now…");
        connectToRoom();
      }
    }, delay);
  }, [connectToRoom]);

  // ── Heartbeat: 5s checks for unstable connections ──
  const startHeartbeat = useCallback((room: Room) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = window.setInterval(() => {
      if (intentionalDisconnect.current) {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        return;
      }

      if (room.state === ConnectionState.Disconnected) {
        console.warn("[LiveKit] ❤️ Heartbeat: disconnect detected — reconnecting");
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        scheduleReconnect();
      }
    }, 5_000); // Check every 5 seconds
  }, [scheduleReconnect]);

  // ── Periodic quality check: adapt video mid-stream ──
  const startQualityCheck = useCallback(() => {
    if (qualityCheckRef.current) clearInterval(qualityCheckRef.current);

    qualityCheckRef.current = window.setInterval(() => {
      if (intentionalDisconnect.current || !roomRef.current) {
        if (qualityCheckRef.current) clearInterval(qualityCheckRef.current);
        return;
      }
      const q = getNetworkQuality();
      const ct = getConnectionType();
      setNetworkQuality(q);
      setConnectionType(ct);
    }, 15_000); // Check every 15 seconds
  }, []);

  // ── Visibility: reconnect on foreground (Android app resume) ──
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === "visible" && !intentionalDisconnect.current) {
        // Re-acquire wake lock
        await requestWakeLock();

        const room = roomRef.current;
        if (!room || room.state === ConnectionState.Disconnected) {
          console.log("[LiveKit] App foregrounded — reconnecting");
          connectAttemptRef.current = 0; // Fresh start
          connectToRoom();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [connectToRoom]);

  // ── Online event: instant reconnect on network restore ──
  useEffect(() => {
    const handleOnline = () => {
      if (!intentionalDisconnect.current) {
        const room = roomRef.current;
        if (!room || room.state !== ConnectionState.Connected) {
          console.log("[LiveKit] 📶 Network restored — reconnecting immediately");
          connectAttemptRef.current = 0;
          setTimeout(() => connectToRoom(), 500); // Tiny delay for network to stabilize
        }
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [connectToRoom]);

  // ── Public API ──
  const disconnect = useCallback(() => {
    intentionalDisconnect.current = true;
    if (autoReconnectRef.current) { clearTimeout(autoReconnectRef.current); autoReconnectRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (qualityCheckRef.current) { clearInterval(qualityCheckRef.current); qualityCheckRef.current = null; }
    releaseWakeLock();
    if (roomRef.current) {
      roomRef.current.disconnect(true);
      roomRef.current = null;
    }
    setRoomInstance(null);
    setConnectionState(ConnectionState.Disconnected);
    setError(null);
  }, []);

  const retry = useCallback(async () => {
    disconnect();
    intentionalDisconnect.current = false;
    connectAttemptRef.current = 0;
    await connectToRoom();
  }, [disconnect, connectToRoom]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      intentionalDisconnect.current = true;
      if (autoReconnectRef.current) clearTimeout(autoReconnectRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (qualityCheckRef.current) clearInterval(qualityCheckRef.current);
      releaseWakeLock();
      if (roomRef.current) {
        roomRef.current.disconnect(true);
        roomRef.current = null;
      }
    };
  }, []);

  return {
    room: roomInstance,
    connectionState,
    networkQuality,
    connectionType,
    isConnecting,
    error,
    connect: connectToRoom,
    disconnect,
    retry,
    audioOnly,
  };
};
