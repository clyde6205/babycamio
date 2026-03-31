import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Eye, Volume2, VolumeX, Loader2, RefreshCw, Maximize2, Minimize2,
  SignalHigh, SignalMedium, SignalLow, WifiOff, Activity, Baby, Heart, BatteryWarning, WifiOff as WifiOffIcon2,
  Share2, Copy, Check, QrCode, X, MessageCircle, Mail, Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
  const [showShareQR, setShowShareQR] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [displayName, setDisplayName] = useState("Viewer");
  const containerRef = useRef<HTMLDivElement>(null);

  const [motionAlert, setMotionAlert] = useState(false);
  const [motionLevel, setMotionLevel] = useState(0);
  const [cryAlert, setCryAlert] = useState<string | null>(null);
  const motionTimeoutRef = useRef<number | null>(null);

  // Camera health state
  const [cameraHealth, setCameraHealth] = useState<{
    status: string;
    battery_level: number | null;
    network_quality: string | null;
    last_heartbeat: string | null;
  } | null>(null);

  // Try to load user profile if logged in, but don't block viewer for unauthenticated users
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("display_name").eq("user_id", session.user.id).single();
        if (data?.display_name) setDisplayName(data.display_name);
      } else {
        setDisplayName("Viewer-" + Math.random().toString(36).substring(2, 6));
      }
    };
    loadProfile();
  }, []);

  // Subscribe to camera health updates in realtime
  useEffect(() => {
    if (!roomName) return;

    // Initial fetch
    supabase
      .from("camera_heartbeats")
      .select("status, battery_level, network_quality, last_heartbeat")
      .eq("room_name", roomName)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCameraHealth(data as any);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`heartbeat-${roomName}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "camera_heartbeats", filter: `room_name=eq.${roomName}` },
        (payload) => {
          const row = payload.new as any;
          if (row) setCameraHealth({ status: row.status, battery_level: row.battery_level, network_quality: row.network_quality, last_heartbeat: row.last_heartbeat });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomName]);

  const { room, connectionState, networkQuality, connectionType, isConnecting, error, connect, disconnect, retry, audioOnly } = useLiveKit({
    roomName: roomName || "", participantName: displayName, isPublisher: false,
  });

  // AUTO-CONNECT: Viewer opens link = immediately starts watching. Zero taps.
  const autoConnectedRef = useRef(false);
  useEffect(() => {
    if (!autoConnectedRef.current && displayName && roomName && connectionState === ConnectionState.Disconnected && !isConnecting && !error) {
      autoConnectedRef.current = true;
      console.log("[Viewer] Auto-connecting — zero tap experience");
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
  const appBase = "https://babycam.io";
  const viewerUrl = `${appBase}/viewer/${roomName}`;

  const copyViewerLink = () => {
    navigator.clipboard.writeText(viewerUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const nativeShare = () => {
    if (typeof navigator.share === "function") {
      navigator.share({ title: `BabyCam - ${friendlyName}`, text: `Watch baby camera "${friendlyName}" live! Tap this link on your Android phone:`, url: viewerUrl }).catch(() => {});
    } else {
      copyViewerLink();
    }
  };

  return (
    <div ref={containerRef} className="flex min-h-[100dvh] flex-col bg-black text-white select-none">
      {/* QR Share Overlay */}
      {showShareQR && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setShowShareQR(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md text-center animate-in slide-in-from-bottom-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowShareQR(false)} className="absolute top-4 right-4 text-gray-400"><X className="h-6 w-6" /></button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">📱 Share This Camera</h2>
            <p className="text-sm text-gray-500 mb-4">Send this link — receiver taps → instant live view</p>
            <div className="grid grid-cols-5 gap-2 mb-5">
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Watch my baby camera live!\n${viewerUrl}`)}`, "_blank")} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center"><MessageCircle className="h-6 w-6 text-white" /></div>
                <span className="text-[11px] font-medium text-gray-700">WhatsApp</span>
              </button>
              <button onClick={() => window.open(`fb-messenger://share/?link=${encodeURIComponent(viewerUrl)}`, "_self")} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <div className="h-12 w-12 rounded-full bg-[#0084FF] flex items-center justify-center"><MessageCircle className="h-6 w-6 text-white" /></div>
                <span className="text-[11px] font-medium text-gray-700">Messenger</span>
              </button>
              <button onClick={() => window.open(`sms:?body=${encodeURIComponent(`Watch my baby camera live! ${viewerUrl}`)}`, "_self")} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center"><MessageCircle className="h-6 w-6 text-white" /></div>
                <span className="text-[11px] font-medium text-gray-700">SMS</span>
              </button>
              <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(viewerUrl)}&text=${encodeURIComponent("Watch my baby camera live!")}`, "_blank")} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <div className="h-12 w-12 rounded-full bg-sky-500 flex items-center justify-center"><Send className="h-6 w-6 text-white" /></div>
                <span className="text-[11px] font-medium text-gray-700">Telegram</span>
              </button>
              <button onClick={() => window.open(`mailto:?subject=${encodeURIComponent("Watch my baby camera live!")}&body=${encodeURIComponent(`Tap this link to watch:\n\n${viewerUrl}`)}`, "_self")} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center"><Mail className="h-6 w-6 text-white" /></div>
                <span className="text-[11px] font-medium text-gray-700">Email</span>
              </button>
            </div>
            <Button onClick={nativeShare} className="w-full mb-4 h-12 text-base font-semibold" size="lg">
              <Share2 className="h-5 w-5 mr-2" /> More Apps...
            </Button>
            <div className="border-t pt-4">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">Or scan QR code</p>
              <div className="flex justify-center mb-3"><QRCodeSVG value={viewerUrl} size={160} level="H" includeMargin /></div>
            </div>
            <Button onClick={copyViewerLink} variant="outline" className="w-full mt-3 text-gray-900 h-11">
              {linkCopied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {linkCopied ? "Copied!" : "Copy Link"}
            </Button>
            <p className="text-[10px] text-gray-400 mt-3 break-all">{viewerUrl}</p>
          </div>
        </div>
      )}
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

      {/* Camera Health Status Banner */}
      {cameraHealth && cameraHealth.status !== "healthy" && (
        <div className={`px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 ${
          cameraHealth.status === "disconnected" ? "bg-red-600" : "bg-yellow-600"
        }`}>
          {cameraHealth.status === "disconnected" ? (
            <><WifiOff className="h-4 w-4" /> Camera offline — last seen {cameraHealth.last_heartbeat ? new Date(cameraHealth.last_heartbeat).toLocaleTimeString() : "unknown"}</>
          ) : (
            <><BatteryWarning className="h-4 w-4" /> Camera battery low ({cameraHealth.battery_level}%) — plug in soon</>
          )}
        </div>
      )}
      {cameraHealth?.status === "healthy" && (
        <div className="px-4 py-1 text-center text-[10px] font-medium flex items-center justify-center gap-1 bg-green-600/20 text-green-400">
          <Heart className="h-3 w-3" /> Camera healthy
          {cameraHealth.battery_level !== null && ` · 🔋 ${cameraHealth.battery_level}%`}
        </div>
      )}

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
        {!isConnected && !isReconnecting && !isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 brand-gradient">
            <Loader2 className="h-12 w-12 animate-spin text-[hsl(213,80%,70%)]" />
            <div className="text-center">
              <h2 className="mb-1 text-xl font-bold capitalize">{friendlyName}</h2>
              <p className="text-sm text-white/50">Connecting to camera…</p>
            </div>
            {error && (
              <div className="rounded-lg bg-red-500/20 px-4 py-2 text-center">
                <p className="text-sm text-red-300">{error}</p>
                <Button size="lg" onClick={() => retry()} className="bg-[hsl(213,70%,55%)] hover:bg-[hsl(213,80%,70%)] text-white font-semibold px-10 touch-target mt-3">
                  <RefreshCw className="mr-2 h-5 w-5" /> Retry
                </Button>
              </div>
            )}
          </div>
        )}
        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 brand-gradient">
            <Loader2 className="h-12 w-12 animate-spin text-[hsl(213,80%,70%)]" />
            <div className="text-center">
              <h2 className="mb-1 text-xl font-bold capitalize">{friendlyName}</h2>
              <p className="text-sm text-white/50">Connecting to camera…</p>
            </div>
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
            <button onClick={() => setShowShareQR(true)} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/80">
                <Share2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] opacity-60">Share</span>
            </button>
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
