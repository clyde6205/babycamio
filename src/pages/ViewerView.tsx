import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Eye, Volume2, VolumeX, Loader2, RefreshCw, Maximize2, Minimize2,
  SignalHigh, SignalMedium, SignalLow, WifiOff, Activity, Baby,
} from "lucide-react";
import { useLiveKit, type NetworkQuality } from "@/hooks/use-livekit";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import TalkbackButton from "@/components/TalkbackButton";
import NightVisionToggle from "@/components/NightVisionToggle";
import LullabyPlayer from "@/components/LullabyPlayer";
import ConnectionStatus from "@/components/ConnectionStatus";

const NetworkQualityIcon = ({ quality }: { quality: NetworkQuality }) => {
  switch (quality) {
    case "excellent": return <SignalHigh className="h-4 w-4 text-green-400" />;
    case "good": return <SignalMedium className="h-4 w-4 text-green-400" />;
    case "fair": return <SignalLow className="h-4 w-4 text-yellow-400" />;
    case "poor": return <SignalLow className="h-4 w-4 text-red-400" />;
    default: return <WifiOff className="h-4 w-4 text-red-400" />;
  }
};

const ViewerView = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [displayName, setDisplayName] = useState("Viewer");
  const containerRef = useRef<HTMLDivElement>(null);

  const [motionAlert, setMotionAlert] = useState(false);
  const [motionLevel, setMotionLevel] = useState(0);
  const [cryAlert, setCryAlert] = useState<string | null>(null);
  const motionTimeoutRef = useRef<number | null>(null);

  const { user: autoUser, loading: authLoading } = useAutoAuth();

  useEffect(() => {
    if (authLoading || !autoUser) return;
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", autoUser.id).single();
      if (data?.display_name) setDisplayName(data.display_name);
    };
    loadProfile();
  }, [autoUser, authLoading]);

  const { room, connectionState, networkQuality, isConnecting, error, connect, disconnect, retry, audioOnly } = useLiveKit({
    roomName: roomName || "", participantName: displayName, isPublisher: false,
  });

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === "motion") {
          setMotionAlert(true);
          setMotionLevel(msg.level || 0);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
          motionTimeoutRef.current = window.setTimeout(() => setMotionAlert(false), 4000);
        } else if (msg.type === "cry_detection") {
          setCryAlert(msg.classification);
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
          setTimeout(() => setCryAlert(null), 6000);
        }
      } catch { /* ignore */ }
    };
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room]);

  useEffect(() => {
    if (!room) return;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video && videoRef.current) { track.attach(videoRef.current); setHasRemoteVideo(true); }
      else if (track.kind === Track.Kind.Audio && audioRef.current) { track.attach(audioRef.current); setHasRemoteAudio(true); }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video) setHasRemoteVideo(false);
      if (track.kind === Track.Kind.Audio) setHasRemoteAudio(false);
      track.detach();
    });
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.isSubscribed && pub.track) {
          if (pub.track.kind === Track.Kind.Video && videoRef.current) { pub.track.attach(videoRef.current); setHasRemoteVideo(true); }
          else if (pub.track.kind === Track.Kind.Audio && audioRef.current) { pub.track.attach(audioRef.current); setHasRemoteAudio(true); }
        }
      });
    });
    return () => { room.removeAllListeners(RoomEvent.TrackSubscribed); room.removeAllListeners(RoomEvent.TrackUnsubscribed); };
  }, [room, connectionState]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) { containerRef.current.requestFullscreen?.(); setIsFullscreen(true); }
    else { document.exitFullscreen?.(); setIsFullscreen(false); }
  }, []);

  const handleDisconnect = () => { disconnect(); navigate("/dashboard"); };
  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const friendlyName = roomName?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ") || "Room";

  return (
    <div ref={containerRef} className="flex min-h-[100dvh] flex-col bg-black text-white select-none">
      {motionAlert && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-20">
          <div className="pointer-events-auto animate-bounce rounded-2xl bg-orange-500/95 px-6 py-4 shadow-2xl shadow-orange-500/40 flex items-center gap-3">
            <Activity className="h-8 w-8 text-white animate-pulse" />
            <div>
              <p className="text-lg font-bold text-white">Motion Detected!</p>
              <p className="text-sm text-white/80">Activity level: {motionLevel.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
      {motionAlert && <div className="fixed inset-0 z-40 pointer-events-none border-4 border-orange-500 animate-pulse rounded-none" />}

      {cryAlert && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-32">
          <div className="pointer-events-auto animate-bounce rounded-2xl bg-red-500/95 px-6 py-4 shadow-2xl shadow-red-500/40 flex items-center gap-3">
            <Baby className="h-8 w-8 text-white animate-pulse" />
            <div>
              <p className="text-lg font-bold text-white">Baby {cryAlert === "crying" ? "is Crying!" : "is Fussing"}</p>
              <p className="text-sm text-white/80">Check on your little one</p>
            </div>
          </div>
        </div>
      )}
      {cryAlert && <div className="fixed inset-0 z-40 pointer-events-none border-4 border-red-500 animate-pulse rounded-none" />}

      <header className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={handleDisconnect} className="touch-target flex items-center gap-2"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-2">
          {isConnected && hasRemoteVideo && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-600/80 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-white" /><span className="text-xs font-bold">{t("viewer.watching")}</span>
            </div>
          )}
          {motionAlert && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-500/90 px-3 py-1 animate-pulse">
              <Activity className="h-3 w-3" /><span className="text-xs font-bold">MOTION</span>
            </div>
          )}
          {isReconnecting && (
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-600/80 px-3 py-1">
              <Loader2 className="h-3 w-3 animate-spin" /><span className="text-xs font-bold">{t("camera.reconnecting")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus connectionState={connectionState} />
          <NetworkQualityIcon quality={networkQuality} />
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted={muted} className={`absolute inset-0 h-full w-full object-contain bg-black ${!hasRemoteVideo ? "hidden" : ""}`} />
        <audio ref={audioRef} autoPlay muted={muted} className="hidden" />
        {isConnected && !hasRemoteVideo && (
          <div className="flex flex-col items-center justify-center gap-3">
            {hasRemoteAudio ? (
              <>
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[hsl(213,80%,70%)]/30 bg-white/5">
                  <Volume2 className="h-12 w-12 text-[hsl(213,80%,70%)] animate-pulse" />
                </div>
                <p className="text-lg font-semibold">{t("viewer.audioOnly")}</p>
                <p className="text-sm text-white/50">{t("viewer.audioOnlyDesc")}</p>
              </>
            ) : (
              <><Loader2 className="h-10 w-10 animate-spin text-white/30" /><p className="text-sm text-white/50">{t("viewer.waitingCamera")}</p></>
            )}
          </div>
        )}
        {!isConnected && !isReconnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 brand-gradient">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[hsl(213,80%,70%)]/30 bg-white/5">
              <Eye className="h-12 w-12 text-[hsl(213,80%,70%)]" />
            </div>
            <div className="text-center">
              <h2 className="mb-1 text-xl font-bold capitalize">{friendlyName}</h2>
              <p className="text-sm text-white/50">{t("viewer.connectToView")}</p>
            </div>
            {error && (<div className="rounded-lg bg-red-500/20 px-4 py-2 text-center"><p className="text-sm text-red-300">{error}</p></div>)}
            <Button size="lg" onClick={error ? retry : connect} disabled={isConnecting} className="bg-[hsl(213,70%,55%)] hover:bg-[hsl(213,80%,70%)] text-white font-semibold px-10 touch-target">
              {isConnecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : error ? <RefreshCw className="mr-2 h-5 w-5" /> : <Eye className="mr-2 h-5 w-5" />}
              {isConnecting ? t("camera.connecting") : error ? t("camera.retry") : t("viewer.watchLive")}
            </Button>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="safe-bottom bg-gradient-to-t from-black/90 to-transparent px-6 pb-4 pt-6">
          <div className="flex items-center justify-center gap-5">
            <button onClick={() => setMuted(!muted)} className="touch-target flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? "bg-red-500/80" : "bg-white/15"}`}>
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </div>
              <span className="text-[10px] opacity-60">{muted ? t("viewer.unmute") : t("viewer.sound")}</span>
            </button>
            <TalkbackButton room={room} isConnected={isConnected} />
            <NightVisionToggle videoRef={videoRef} />
            <LullabyPlayer room={room} isConnected={isConnected} />
            <button onClick={toggleFullscreen} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </div>
              <span className="text-[10px] opacity-60">{t("viewer.fullscreen")}</span>
            </button>
            <button onClick={handleDisconnect} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/30">
                <ArrowLeft className="h-5 w-5" />
              </div>
              <span className="text-[10px] opacity-60">{t("viewer.leave")}</span>
            </button>
          </div>
          <div className="mt-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-white/30">
              {friendlyName} · BabyCam.io · {networkQuality === "excellent" ? "4K" : networkQuality === "good" ? "HD" : networkQuality === "fair" ? "SD" : "Audio"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewerView;
