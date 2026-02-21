import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Video, VideoOff, Mic, MicOff, Wifi, WifiOff, Loader2, RefreshCw,
  Signal, SignalLow, SignalMedium, SignalHigh, Volume2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLiveKit, type NetworkQuality } from "@/hooks/use-livekit";
import { ConnectionState, Track } from "livekit-client";

const NetworkQualityIcon = ({ quality }: { quality: NetworkQuality }) => {
  switch (quality) {
    case "excellent": return <SignalHigh className="h-4 w-4 text-green-400" />;
    case "good": return <SignalMedium className="h-4 w-4 text-green-400" />;
    case "fair": return <SignalLow className="h-4 w-4 text-yellow-400" />;
    case "poor": return <SignalLow className="h-4 w-4 text-red-400" />;
    default: return <WifiOff className="h-4 w-4 text-red-400" />;
  }
};

const QualityLabel = ({ quality }: { quality: NetworkQuality }) => {
  const { t } = useTranslation();
  const labels: Record<NetworkQuality, string> = {
    excellent: t("camera.quality4k"), good: t("camera.quality1080p"), fair: t("camera.quality480p"), poor: t("camera.qualityAudioOnly"), offline: t("camera.qualityOffline"),
  };
  return <span className="text-[10px] uppercase tracking-wider opacity-60">{labels[quality]}</span>;
};

const CameraView = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [displayName, setDisplayName] = useState("Camera");
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", session.user.id).single();
      if (data?.display_name) setDisplayName(data.display_name);
    };
    getProfile();
  }, [navigate]);

  const { room, connectionState, networkQuality, isConnecting, error, connect, disconnect, retry, audioOnly } = useLiveKit({
    roomName: roomName || "", participantName: displayName, isPublisher: true,
  });

  useEffect(() => {
    if (!room || connectionState !== ConnectionState.Connected) return;
    const attachVideo = () => {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (publication?.track && videoRef.current) publication.track.attach(videoRef.current);
    };
    attachVideo();
    room.localParticipant.on("trackPublished", attachVideo);
    return () => { room.localParticipant.off("trackPublished", attachVideo); };
  }, [room, connectionState]);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      setElapsedTime(0);
      timerRef.current = window.setInterval(() => setElapsedTime((t) => t + 1), 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connectionState]);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      supabase.from("rooms").update({ is_active: true }).eq("room_name", roomName).then(({ error }) => {
        if (error) console.warn("Failed to set room active:", error.message);
      });
    }
    return () => {
      supabase.from("rooms").update({ is_active: false }).eq("room_name", roomName).then(({ error }) => {
        if (error) console.warn("Failed to set room inactive:", error.message);
      });
    };
  }, [connectionState, roomName]);

  const toggleVideo = useCallback(() => {
    if (room) { room.localParticipant.setCameraEnabled(!videoEnabled); setVideoEnabled(!videoEnabled); }
  }, [room, videoEnabled]);

  const toggleAudio = useCallback(() => {
    if (room) { room.localParticipant.setMicrophoneEnabled(!audioEnabled); setAudioEnabled(!audioEnabled); }
  }, [room, audioEnabled]);

  const handleDisconnect = async () => {
    disconnect();
    await supabase.from("rooms").update({ is_active: false }).eq("room_name", roomName);
    navigate("/dashboard");
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const friendlyName = roomName?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ") || "Room";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-black text-white select-none">
      <header className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={handleDisconnect} className="touch-target flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          {isConnected && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span className="text-xs font-bold">LIVE</span>
              <span className="text-xs tabular-nums">{formatTime(elapsedTime)}</span>
            </div>
          )}
          {isReconnecting && (
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-600/90 px-3 py-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs font-bold">{t("camera.reconnecting")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NetworkQualityIcon quality={networkQuality} />
          <QualityLabel quality={networkQuality} />
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />

        {audioOnly && isConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <Volume2 className="mb-3 h-16 w-16 text-[hsl(213,80%,70%)]" />
            <p className="text-lg font-semibold">{t("camera.audioOnlyMode")}</p>
            <p className="text-sm text-white/50">{t("camera.lowBandwidth")}</p>
          </div>
        )}

        {!isConnected && !isReconnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 brand-gradient">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[hsl(213,80%,70%)]/30 bg-white/5">
              <Video className="h-12 w-12 text-[hsl(213,80%,70%)]" />
            </div>
            <div className="text-center">
              <h2 className="mb-1 text-xl font-bold capitalize">{friendlyName}</h2>
              <p className="text-sm text-white/50">
                {networkQuality === "excellent" ? t("camera.ready4k") : networkQuality === "good" ? t("camera.readyHd") : networkQuality === "fair" ? t("camera.readyStandard") : t("camera.readyLowBandwidth")}
              </p>
            </div>
            {error && (
              <div className="rounded-lg bg-red-500/20 px-4 py-2 text-center">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button size="lg" onClick={error ? retry : connect} disabled={isConnecting} className="bg-[hsl(213,70%,55%)] hover:bg-[hsl(213,80%,70%)] text-white font-semibold px-10 touch-target">
                {isConnecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : error ? <RefreshCw className="mr-2 h-5 w-5" /> : <Video className="mr-2 h-5 w-5" />}
                {isConnecting ? t("camera.connecting") : error ? t("camera.retry") : t("camera.goLive")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="safe-bottom bg-gradient-to-t from-black/90 to-transparent px-6 pb-4 pt-6">
          <div className="flex items-center justify-center gap-8">
            <button onClick={toggleVideo} className="touch-target flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${videoEnabled ? "bg-white/15" : "bg-red-500/80"}`}>
                {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </div>
              <span className="text-[10px] opacity-60">{videoEnabled ? t("camera.camera") : t("camera.off")}</span>
            </button>
            <button onClick={toggleAudio} className="touch-target flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${audioEnabled ? "bg-white/15" : "bg-red-500/80"}`}>
                {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </div>
              <span className="text-[10px] opacity-60">{audioEnabled ? t("camera.mic") : t("camera.muted")}</span>
            </button>
            <button onClick={handleDisconnect} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/30">
                <VideoOff className="h-6 w-6" />
              </div>
              <span className="text-[10px] opacity-60">{t("camera.end")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraView;
