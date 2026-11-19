import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Volume2, VolumeX, Loader2, RefreshCw, Maximize2, Minimize2,
  SignalHigh, SignalMedium, SignalLow, WifiOff, Activity, Baby, Heart, BatteryWarning,
  Share2, Circle,
} from "lucide-react";
import ShareSheet from "@/components/ShareSheet";
import { useLiveKit, type NetworkQuality } from "@/hooks/use-livekit";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import TalkbackButton from "@/components/TalkbackButton";
import NightVisionToggle from "@/components/NightVisionToggle";
import LullabyPlayer from "@/components/LullabyPlayer";
import ConnectionStatus from "@/components/ConnectionStatus";
import { useToast } from "@/hooks/use-toast";
import { viewerLink } from "@/lib/share";

const NetworkQualityIcon = ({ quality }: { quality: NetworkQuality }) => {
  switch (quality) {
    case "excellent": return <SignalHigh className="h-4 w-4 text-green-400" />;
    case "good": return <SignalMedium className="h-4 w-4 text-green-400" />;
    case "fair": return <SignalLow className="h-4 w-4 text-yellow-400" />;
    case "poor": return <SignalLow className="h-4 w-4 text-red-400" />;
    default: return <WifiOff className="h-4 w-4 text-red-400" />;
  }
};

const friendlyRoomName = (roomName: string) =>
  roomName.replace(/-[a-z0-9]+$/i, "").replace(/-/g, " ") || roomName;

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
  const [showShareQR, setShowShareQR] = useState(false);
  const [displayName, setDisplayName] = useState("Viewer");
  const [hasAccount, setHasAccount] = useState(false);
  const [resolvedRoomName, setResolvedRoomName] = useState<string | null>(null);
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [motionAlert, setMotionAlert] = useState(false);
  const [motionLevel, setMotionLevel] = useState(0);
  const [cryAlert, setCryAlert] = useState<string | null>(null);
  const motionTimeoutRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const VIEWER_RECORD_DURATION = 5 * 60;

  const [cameraHealth, setCameraHealth] = useState<{
    status: string;
    battery_level: number | null;
    network_quality: string | null;
    last_heartbeat: string | null;
  } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasAccount(Boolean(session?.user));
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("display_name").eq("user_id", session.user.id).maybeSingle();
        if (data?.display_name) setDisplayName(data.display_name);
      } else {
        setDisplayName("Viewer-" + crypto.randomUUID().slice(0, 4));
      }
    };
    void loadProfile();
  }, []);

  // Resolve the private viewer key to canonical room metadata through the same
  // authorization boundary used for the LiveKit token. The token itself is discarded;
  // useLiveKit performs the actual connect-time token request.
  useEffect(() => {
    if (!roomName) return;
    let cancelled = false;

    const resolveRoom = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/livekit-token`, {
          method: "POST",
          headers,
          body: JSON.stringify({ roomName, participantName: "room-metadata", isPublisher: false }),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setResolvedRoomName(typeof data.roomName === "string" ? data.roomName : null);
          setResolvedRoomId(typeof data.roomId === "string" ? data.roomId : null);
        }
      } catch {
        // The connect path surfaces the actionable authorization/network error.
      }
    };

    void resolveRoom();
    return () => { cancelled = true; };
  }, [roomName]);

  // Poll the narrowly scoped health RPC. Anonymous table access and realtime reads
  // of all heartbeats are intentionally disabled by RLS.
  useEffect(() => {
    if (!resolvedRoomId) return;
    let cancelled = false;

    const loadHealth = async () => {
      const { data } = await (supabase as any).rpc("get_camera_health", { _room_id: resolvedRoomId });
      if (!cancelled && Array.isArray(data) && data[0]) {
        setCameraHealth(data[0]);
      }
    };

    void loadHealth();
    const interval = window.setInterval(loadHealth, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [resolvedRoomId]);

  const { room, connectionState, networkQuality, isConnecting, error, connect, disconnect, retry } = useLiveKit({
    roomName: roomName || "", participantName: displayName, isPublisher: false,
  });

  const autoConnectedRef = useRef(false);
  useEffect(() => {
    if (!autoConnectedRef.current && displayName && roomName && connectionState === ConnectionState.Disconnected && !isConnecting && !error) {
      autoConnectedRef.current = true;
      connect();
    }
  }, [displayName, roomName, connectionState, isConnecting, error, connect]);

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
      } catch { /* ignore malformed data */ }
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

  const stopViewerRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingTimeLeft(0);
    if (recordingTimerRef.current) { clearTimeout(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startViewerRecording = useCallback(() => {
    if (isRecording || !videoRef.current) return;
    const videoEl = videoRef.current;
    let stream: MediaStream | null = null;
    if (videoEl.srcObject instanceof MediaStream) stream = videoEl.srcObject;
    else if ((videoEl as any).captureStream) stream = (videoEl as any).captureStream();

    if (audioRef.current?.srcObject instanceof MediaStream) {
      const audioTracks = (audioRef.current.srcObject as MediaStream).getAudioTracks();
      if (stream && audioTracks.length > 0) audioTracks.forEach((track) => stream!.addTrack(track.clone()));
    }
    if (!stream || stream.getTracks().length === 0) {
      toast({ title: "Cannot record", description: "No video stream available yet.", variant: "destructive" });
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    try {
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const fileName = `babycam-viewer-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
        const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        toast({ title: "Recording saved", description: `${sizeMB} MB downloaded to your device` });
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTimeLeft(VIEWER_RECORD_DURATION);
      countdownRef.current = window.setInterval(() => setRecordingTimeLeft((previous) => previous <= 1 ? 0 : previous - 1), 1000);
      recordingTimerRef.current = window.setTimeout(() => stopViewerRecording(), VIEWER_RECORD_DURATION * 1000);
      toast({ title: "Recording started", description: "Tap again to stop" });
    } catch (err) {
      console.error("[ViewerRecord] Failed:", err);
      toast({ title: "Recording failed", description: "Your device may not support recording.", variant: "destructive" });
    }
  }, [isRecording, stopViewerRecording, toast]);

  const handleViewerRecord = useCallback(() => {
    if (isRecording) stopViewerRecording();
    else startViewerRecording();
  }, [isRecording, stopViewerRecording, startViewerRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) { containerRef.current.requestFullscreen?.(); setIsFullscreen(true); }
    else { document.exitFullscreen?.(); setIsFullscreen(false); }
  }, []);

  const handleDisconnect = () => {
    stopViewerRecording();
    disconnect();
    navigate(hasAccount ? "/dashboard" : "/");
  };

  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const friendlyName = resolvedRoomName ? friendlyRoomName(resolvedRoomName) : "Private Camera";
  const viewerUrl = viewerLink(roomName || "");

  return (
    <div ref={containerRef} className="flex min-h-[100dvh] select-none flex-col bg-black text-white">
      <ShareSheet open={showShareQR} onOpenChange={setShowShareQR} url={viewerUrl} title={friendlyName} roomName={resolvedRoomName || undefined} />
      {motionAlert && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="pointer-events-auto flex animate-bounce items-center gap-3 rounded-2xl bg-orange-500/95 px-6 py-4 shadow-2xl shadow-orange-500/40">
            <Activity className="h-8 w-8 animate-pulse text-white" />
            <div>
              <p className="text-lg font-bold text-white">Motion Detected!</p>
              <p className="text-sm text-white/80">Activity level: {motionLevel.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
      {motionAlert && <div className="pointer-events-none fixed inset-0 z-40 animate-pulse border-4 border-orange-500" />}

      {cryAlert && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-32">
          <div className="pointer-events-auto flex animate-bounce items-center gap-3 rounded-2xl bg-red-500/95 px-6 py-4 shadow-2xl shadow-red-500/40">
            <Baby className="h-8 w-8 animate-pulse text-white" />
            <div>
              <p className="text-lg font-bold text-white">Baby {cryAlert === "crying" ? "is Crying!" : "is Fussing"}</p>
              <p className="text-sm text-white/80">Check on your little one</p>
            </div>
          </div>
        </div>
      )}
      {cryAlert && <div className="pointer-events-none fixed inset-0 z-40 animate-pulse border-4 border-red-500" />}

      {cameraHealth && cameraHealth.status !== "healthy" && (
        <div className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold ${cameraHealth.status === "disconnected" ? "bg-red-600" : "bg-yellow-600"}`}>
          {cameraHealth.status === "disconnected" ? (
            <><WifiOff className="h-4 w-4" /> Camera offline — last seen {cameraHealth.last_heartbeat ? new Date(cameraHealth.last_heartbeat).toLocaleTimeString() : "unknown"}</>
          ) : (
            <><BatteryWarning className="h-4 w-4" /> Camera battery low ({cameraHealth.battery_level}%) — plug in soon</>
          )}
        </div>
      )}
      {cameraHealth?.status === "healthy" && (
        <div className="flex items-center justify-center gap-1 bg-green-600/20 px-4 py-1 text-center text-[10px] font-medium text-green-400">
          <Heart className="h-3 w-3" /> Camera healthy
          {cameraHealth.battery_level !== null && ` · Battery ${cameraHealth.battery_level}%`}
        </div>
      )}

      <header className="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
        <button onClick={handleDisconnect} className="touch-target flex items-center gap-2" aria-label="Leave viewer"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-2">
          {isConnected && hasRemoteVideo && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-600/80 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-white" /><span className="text-xs font-bold">{t("viewer.watching")}</span>
            </div>
          )}
          {motionAlert && (
            <div className="flex animate-pulse items-center gap-1.5 rounded-full bg-orange-500/90 px-3 py-1">
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
        <video ref={videoRef} autoPlay playsInline muted={muted} className={`absolute inset-0 h-full w-full bg-black object-contain ${!hasRemoteVideo ? "hidden" : ""}`} />
        <audio ref={audioRef} autoPlay muted={muted} className="hidden" />
        {isConnected && !hasRemoteVideo && (
          <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
            {hasRemoteAudio ? (
              <>
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[hsl(213,80%,70%)]/30 bg-white/5">
                  <Volume2 className="h-12 w-12 animate-pulse text-[hsl(213,80%,70%)]" />
                </div>
                <p className="text-lg font-semibold">{t("viewer.audioOnly")}</p>
                <p className="text-sm text-white/50">{t("viewer.audioOnlyDesc")}</p>
              </>
            ) : (
              <><Loader2 className="h-10 w-10 animate-spin text-white/30" /><p className="text-sm text-white/50">{t("viewer.waitingCamera")}</p></>
            )}
          </div>
        )}
        {!isConnected && !isReconnecting && !isConnecting && (
          <div className="brand-gradient absolute inset-0 flex flex-col items-center justify-center gap-5 px-4">
            <Loader2 className="h-12 w-12 animate-spin text-[hsl(213,80%,70%)]" />
            <div className="text-center">
              <h2 className="mb-1 text-xl font-bold capitalize">{friendlyName}</h2>
              <p className="text-sm text-white/50">Connecting to camera…</p>
            </div>
            {error && (
              <div className="max-w-sm rounded-lg bg-red-500/20 px-4 py-2 text-center">
                <p className="text-sm text-red-300">{error}</p>
                <Button size="lg" onClick={() => retry()} className="touch-target mt-3 bg-[hsl(213,70%,55%)] px-10 font-semibold text-white hover:bg-[hsl(213,80%,70%)]">
                  <RefreshCw className="mr-2 h-5 w-5" /> Retry
                </Button>
              </div>
            )}
          </div>
        )}
        {isConnecting && (
          <div className="brand-gradient absolute inset-0 flex flex-col items-center justify-center gap-5 px-4">
            <Loader2 className="h-12 w-12 animate-spin text-[hsl(213,80%,70%)]" />
            <div className="text-center">
              <h2 className="mb-1 text-xl font-bold capitalize">{friendlyName}</h2>
              <p className="text-sm text-white/50">Connecting to camera…</p>
            </div>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="safe-bottom bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button onClick={handleViewerRecord} className="touch-target flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isRecording ? "animate-pulse bg-red-600" : "bg-white/15"}`}>
                <Circle className={`h-5 w-5 ${isRecording ? "fill-white" : ""}`} />
              </div>
              <span className="text-[10px] opacity-60">{isRecording ? formatTime(recordingTimeLeft) : "Record"}</span>
            </button>
            <button onClick={() => setMuted(!muted)} className="touch-target flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? "bg-red-500/80" : "bg-white/15"}`}>
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </div>
              <span className="text-[10px] opacity-60">{muted ? t("viewer.unmute") : t("viewer.sound")}</span>
            </button>
            <TalkbackButton room={room} isConnected={isConnected} />
            <NightVisionToggle videoRef={videoRef} />
            <LullabyPlayer room={room} isConnected={isConnected} />
            <button onClick={() => setShowShareQR(true)} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/80"><Share2 className="h-5 w-5" /></div>
              <span className="text-[10px] opacity-60">Share</span>
            </button>
            <button onClick={toggleFullscreen} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </div>
              <span className="text-[10px] opacity-60">{t("viewer.fullscreen")}</span>
            </button>
            <button onClick={handleDisconnect} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/30"><ArrowLeft className="h-5 w-5" /></div>
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
