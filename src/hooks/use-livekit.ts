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

interface UseLiveKitOptions {
  roomName: string;
  participantName: string;
  isPublisher: boolean;
}

interface UseLiveKitReturn {
  room: Room | null;
  connectionState: ConnectionState;
  networkQuality: NetworkQuality;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  retry: () => Promise<void>;
  audioOnly: boolean;
}

// ─── Network helpers ───────────────────────────────────────────────
const getNetworkQuality = (): NetworkQuality => {
  if (!navigator.onLine) return "offline";
  const nav = navigator as any;
  if (!nav.connection) return "good";
  const type = nav.connection.effectiveType;
  if (type === "4g") return "excellent";
  if (type === "3g") return "good";
  if (type === "2g") return "fair";
  if (type === "slow-2g") return "poor";
  return "good";
};

// ─── Room options by quality ───────────────────────────────────────
const getRoomOptions = (quality: NetworkQuality, isPublisher: boolean): RoomOptions => {
  const base: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    disconnectOnPageLeave: false, // We handle lifecycle ourselves
    reconnectPolicy: {
      nextRetryDelayInMs: (context) => {
        // Aggressive reconnect: 300ms → 600ms → 1.2s → … max 8s, up to 30 attempts
        const delay = Math.min(300 * Math.pow(2, context.retryCount), 8000);
        return context.retryCount < 30 ? delay : null;
      },
    },
  };

  if (!isPublisher) return base;

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
  };

  return { ...base, ...presets[quality] || presets.poor };
};

// ─── Fetch token (never throws fatally) ────────────────────────────
const fetchTokenFromServer = async (
  roomName: string,
  participantName: string,
  isPublisher: boolean
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

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/livekit-token`,
    { method: "POST", headers, body: JSON.stringify({ roomName, participantName, isPublisher }) }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Token request failed (${response.status})`);
  }

  return response.json();
};

// ─── Main hook ─────────────────────────────────────────────────────
export const useLiveKit = ({
  roomName,
  participantName,
  isPublisher,
}: UseLiveKitOptions): UseLiveKitReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(getNetworkQuality);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [roomInstance, setRoomInstance] = useState<Room | null>(null);

  const roomRef = useRef<Room | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const autoReconnectRef = useRef<number | null>(null);
  const intentionalDisconnect = useRef(false);
  const connectAttemptRef = useRef(0);

  // ── Network quality monitor ──
  useEffect(() => {
    const nav = navigator as any;
    const update = () => {
      const q = getNetworkQuality();
      setNetworkQuality(q);
      if (q === "poor" && roomRef.current) setAudioOnly(true);
      else if (q !== "poor") setAudioOnly(false);
    };

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (nav.connection) nav.connection.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (nav.connection) nav.connection.removeEventListener("change", update);
    };
  }, []);

  // ── Enable devices with fallbacks ──
  const enableDevices = useCallback(async (room: Room, quality: NetworkQuality) => {
    if (!isPublisher) return;
    try {
      if (quality === "poor") {
        await room.localParticipant.setMicrophoneEnabled(true);
        setAudioOnly(true);
      } else {
        await room.localParticipant.enableCameraAndMicrophone();
        setAudioOnly(false);
      }
    } catch (e: any) {
      console.warn("[LiveKit] Primary device enable failed, trying fallbacks:", e.message);
      try { await room.localParticipant.setCameraEnabled(true); } catch { /* ok */ }
      try { await room.localParticipant.setMicrophoneEnabled(true); } catch { /* ok */ }
    }
  }, [isPublisher]);

  // ── Core connect ──
  const connectToRoom = useCallback(async () => {
    if (roomRef.current?.state === ConnectionState.Connected) return; // already connected

    setIsConnecting(true);
    setError(null);
    intentionalDisconnect.current = false;
    connectAttemptRef.current += 1;
    const thisAttempt = connectAttemptRef.current;

    try {
      const { token, url } = await fetchTokenFromServer(roomName, participantName, isPublisher);
      const quality = getNetworkQuality();
      setNetworkQuality(quality);

      // Clean up previous room if any
      if (roomRef.current) {
        try { roomRef.current.disconnect(true); } catch { /* ok */ }
        roomRef.current = null;
      }

      const room = new Room(getRoomOptions(quality, isPublisher));
      roomRef.current = room;

      // ── Room event handlers ──
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setConnectionState(state);
      });

      room.on(RoomEvent.Reconnecting, () => {
        console.log("[LiveKit] Reconnecting…");
        setConnectionState(ConnectionState.Reconnecting);
        setError(null);
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log("[LiveKit] Reconnected successfully");
        setConnectionState(ConnectionState.Connected);
        setError(null);
      });

      room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        console.log("[LiveKit] Disconnected, reason:", reason);
        setConnectionState(ConnectionState.Disconnected);
        setRoomInstance(null);

        // Auto-reconnect unless user intentionally disconnected
        if (!intentionalDisconnect.current && thisAttempt === connectAttemptRef.current) {
          setError("Connection lost — reconnecting…");
          scheduleReconnect();
        }
      });

      room.on(RoomEvent.SignalReconnecting, () => setError(null));

      // ── Connect to LiveKit server ──
      console.log("[LiveKit] Connecting to", url, "room:", roomName);
      await room.connect(url, token);
      console.log("[LiveKit] ✅ Connected! Room:", room.name);

      setConnectionState(ConnectionState.Connected);
      setRoomInstance(room);
      setError(null);

      // Enable devices (separate from connection)
      await enableDevices(room, quality);

      // Start heartbeat monitor
      startHeartbeat(room);
    } catch (err: any) {
      console.error("[LiveKit] Connection failed:", err.message);

      if (thisAttempt === connectAttemptRef.current && !intentionalDisconnect.current) {
        setError(err.message || "Failed to connect");
        setConnectionState(ConnectionState.Disconnected);
        // Auto-retry after delay
        scheduleReconnect();
      }
    } finally {
      setIsConnecting(false);
    }
  }, [roomName, participantName, isPublisher, enableDevices]);

  // ── Schedule auto-reconnect with backoff ──
  const scheduleReconnect = useCallback(() => {
    if (intentionalDisconnect.current) return;
    if (autoReconnectRef.current) clearTimeout(autoReconnectRef.current);

    const delay = Math.min(2000 * Math.pow(1.5, Math.min(connectAttemptRef.current, 10)), 30000);
    console.log(`[LiveKit] Auto-reconnect in ${Math.round(delay / 1000)}s…`);

    autoReconnectRef.current = window.setTimeout(() => {
      if (!intentionalDisconnect.current) {
        console.log("[LiveKit] Auto-reconnecting now…");
        connectToRoom();
      }
    }, delay);
  }, [connectToRoom]);

  // ── Heartbeat: check room is alive every 10s ──
  const startHeartbeat = useCallback((room: Room) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = window.setInterval(() => {
      if (intentionalDisconnect.current) {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        return;
      }

      const state = room.state;
      if (state === ConnectionState.Disconnected) {
        console.warn("[LiveKit] Heartbeat detected disconnect — reconnecting");
        scheduleReconnect();
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      }
    }, 10_000);
  }, [scheduleReconnect]);

  // ── Visibility change: reconnect when app comes to foreground ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !intentionalDisconnect.current) {
        const room = roomRef.current;
        if (!room || room.state === ConnectionState.Disconnected) {
          console.log("[LiveKit] App foregrounded — reconnecting");
          connectToRoom();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [connectToRoom]);

  // ── Online/offline: reconnect when network returns ──
  useEffect(() => {
    const handleOnline = () => {
      if (!intentionalDisconnect.current) {
        const room = roomRef.current;
        if (!room || room.state !== ConnectionState.Connected) {
          console.log("[LiveKit] Network restored — reconnecting");
          setTimeout(() => connectToRoom(), 1000);
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

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      intentionalDisconnect.current = true;
      if (autoReconnectRef.current) clearTimeout(autoReconnectRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
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
    isConnecting,
    error,
    connect: connectToRoom,
    disconnect,
    retry,
    audioOnly,
  };
};
