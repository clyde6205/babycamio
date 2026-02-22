import { useState, useCallback, useRef, useEffect } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  LocalTrackPublication,
  RemoteTrackPublication,
  Participant,
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

const getNetworkQuality = (): NetworkQuality => {
  const nav = navigator as any;
  if (!nav.connection) return "good";
  const type = nav.connection.effectiveType;
  if (type === "4g") return "excellent";
  if (type === "3g") return "good";
  if (type === "2g") return "fair";
  if (type === "slow-2g") return "poor";
  return "good";
};

const getRoomOptions = (quality: NetworkQuality, isPublisher: boolean): RoomOptions => {
  const base: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    disconnectOnPageLeave: true,
    reconnectPolicy: {
      nextRetryDelayInMs: (context) => {
        // Exponential backoff: 500ms, 1s, 2s, 4s, max 10s
        const delay = Math.min(500 * Math.pow(2, context.retryCount), 10000);
        return context.retryCount < 10 ? delay : null;
      },
    },
  };

  if (isPublisher) {
    switch (quality) {
      case "excellent":
        return {
          ...base,
          videoCaptureDefaults: {
            resolution: { width: 3840, height: 2160, frameRate: 30 }, // 4K
          },
          publishDefaults: {
            videoSimulcastLayers: [
              VideoPresets.h2160,
              VideoPresets.h1080,
              VideoPresets.h720,
              VideoPresets.h360,
            ],
            videoCodec: "vp8",
            dtx: true,
            red: true,
          },
        };
      case "good":
        return {
          ...base,
          videoCaptureDefaults: {
            resolution: { width: 1920, height: 1080, frameRate: 24 },
          },
          publishDefaults: {
            videoSimulcastLayers: [
              VideoPresets.h1080,
              VideoPresets.h720,
              VideoPresets.h360,
            ],
            videoCodec: "vp8",
            dtx: true,
            red: true,
          },
        };
      case "fair":
        return {
          ...base,
          videoCaptureDefaults: {
            resolution: { width: 640, height: 480, frameRate: 15 },
          },
          publishDefaults: {
            videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h180],
            videoCodec: "vp8",
            dtx: true,
            red: true,
          },
        };
      default: // poor
        return {
          ...base,
          videoCaptureDefaults: {
            resolution: { width: 320, height: 240, frameRate: 10 },
          },
          publishDefaults: {
            videoCodec: "vp8",
            dtx: true,
            red: true,
          },
        };
    }
  }

  return base;
};

export const useLiveKit = ({
  roomName,
  participantName,
  isPublisher,
}: UseLiveKitOptions): UseLiveKitReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(getNetworkQuality);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [roomInstance, setRoomInstance] = useState<Room | null>(null);
  const roomRef = useRef<Room | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Monitor network changes
  useEffect(() => {
    const nav = navigator as any;
    if (!nav.connection) return;
    const handler = () => {
      const q = getNetworkQuality();
      setNetworkQuality(q);
      if (q === "poor" && roomRef.current) {
        setAudioOnly(true);
      } else if (q !== "poor") {
        setAudioOnly(false);
      }
    };
    nav.connection.addEventListener("change", handler);
    return () => nav.connection.removeEventListener("change", handler);
  }, []);

  const fetchToken = useCallback(async (): Promise<{ token: string; url: string }> => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };

    // Attach auth if available, but don't require it
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch { /* no auth, that's fine */ }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/livekit-token`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ roomName, participantName, isPublisher }),
      }
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Token request failed (${response.status})`);
    }

    return response.json();
  }, [roomName, participantName, isPublisher]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { token, url } = await fetchToken();
      const quality = getNetworkQuality();
      setNetworkQuality(quality);

      const opts = getRoomOptions(quality, isPublisher);
      const room = new Room(opts);
      roomRef.current = room;

      // Event listeners
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setConnectionState(state);
      });

      room.on(RoomEvent.Reconnecting, () => {
        setConnectionState(ConnectionState.Reconnecting);
      });

      room.on(RoomEvent.Reconnected, () => {
        setConnectionState(ConnectionState.Connected);
        setError(null);
      });

      room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        setConnectionState(ConnectionState.Disconnected);
        setRoomInstance(null);
        if (reason && reason !== DisconnectReason.CLIENT_INITIATED) {
          setError("Connection lost. Tap retry to reconnect.");
        }
      });

      room.on(RoomEvent.SignalReconnecting, () => {
        setError(null); // clear during reconnect attempts
      });

      await room.connect(url, token);
      setConnectionState(ConnectionState.Connected);
      setRoomInstance(room);

      if (isPublisher) {
        // Enable camera + mic
        if (quality === "poor") {
          // Audio only on very poor connections
          await room.localParticipant.setMicrophoneEnabled(true);
          setAudioOnly(true);
        } else {
          await room.localParticipant.enableCameraAndMicrophone();
          setAudioOnly(false);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      setConnectionState(ConnectionState.Disconnected);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchToken, isPublisher]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
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
    await connect();
  }, [disconnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    connect,
    disconnect,
    retry,
    audioOnly,
  };
};
