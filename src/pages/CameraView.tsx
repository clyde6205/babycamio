import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Video, VideoOff, Mic, MicOff, Wifi, WifiOff, Loader2, RefreshCw,
  Signal, SignalLow, SignalMedium, SignalHigh, Volume2, Activity, Circle, WifiOff as WifiOffIcon,
  Share2, QrCode, Copy, Check, X, MessageCircle, Mail, Send,
} from "lucide-react";
import ShareSheet from "@/components/ShareSheet";
import { useToast } from "@/hooks/use-toast";
import { useLiveKit, type NetworkQuality } from "@/hooks/use-livekit";
import { useMotionDetection } from "@/hooks/use-motion-detection";
import { useCameraHeartbeat } from "@/hooks/use-camera-heartbeat";
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
  const [cameraActive, setCameraActive] = useState(false); // true as soon as getUserMedia succeeds
  const [displayName, setDisplayName] = useState("Camera");
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showShareQR, setShowShareQR] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);
  const [recordingDurationMin, setRecordingDurationMin] = useState(5);
  const [motionSensitivity, setMotionSensitivity] = useState(25);
  const [motionMinPercent, setMotionMinPercent] = useState(1.5);
  const [maxDurationMin, setMaxDurationMin] = useState(60);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const { user: autoUser, loading: authLoading } = useAutoAuth();
  const userId = autoUser?.id || null;
  const { isPro } = useSubscription();
  const storageLimitBytes = isPro ? 10 * 1024 * 1024 * 1024 : 500 * 1024 * 1024;

  useEffect(() => {
    const loadSettings = async () => {
      if (userId) {
        const { data } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
        if (data?.display_name) setDisplayName(data.display_name);

        const { data: userSettings } = await supabase
          .from("user_camera_settings")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (userSettings) {
          setRecordingDurationMin(Math.min(userSettings.recording_duration_minutes, maxDurationMin));
          setMotionSensitivity(userSettings.motion_sensitivity);
        }
      }

      const { data: globalSettings } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "motion_recording")
        .single();

      const global = globalSettings?.setting_value as any;
      if (global) {
        setMaxDurationMin(global.max_duration_minutes || 60);
      if (!userId) {
          setRecordingDurationMin(global.default_duration_minutes || 5);
          setMotionSensitivity(global.motion_sensitivity || 25);
          setMotionMinPercent(global.motion_min_percent || 1.5);
        }
      }
    };
    loadSettings();
  }, [userId]);

  const { room, connectionState, networkQuality, connectionType, isConnecting, error, connect, disconnect, retry, audioOnly } = useLiveKit({
    roomName: roomName || "", participantName: displayName, isPublisher: true,
  });

  const { isMotionDetected, motionLevel, enabled: motionEnabled, setEnabled: setMotionEnabled } = useMotionDetection(
    videoRef.current,
    { threshold: motionSensitivity, minMotionPercent: motionMinPercent, cooldown: 3000 }
  );

  // Camera health heartbeat — sends status every 30s
  useCameraHeartbeat({
    roomName: roomName || "",
    userId,
    isConnected: connectionState === ConnectionState.Connected,
    networkQuality,
    streamActive: videoEnabled,
  });

  // Send motion data + log sleep event + trigger cry detection
  useEffect(() => {
    if (!isMotionDetected || !room || connectionState !== ConnectionState.Connected) return;
    const payload = JSON.stringify({ type: "motion", level: motionLevel, ts: Date.now() });
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(payload), { reliable: true });

    // Log sleep event for analytics
    if (userId) {
      supabase.from("sleep_events").insert({
        user_id: userId,
        room_name: roomName || "",
        event_type: "motion",
        intensity: motionLevel,
      }).then(() => {});
    }

    // Trigger AI cry detection
    if (userId && motionLevel > 3) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch(`https://${projectId}.supabase.co/functions/v1/ai-cry-detection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            audioLevel: motionLevel * 10,
            motionLevel,
            roomName: roomName || "",
            timestamp: new Date().toISOString(),
          }),
        }).then(r => r.json()).then(result => {
          if (result.classification === "crying" || result.classification === "fussing") {
            // Send cry alert to viewers
            const cryPayload = JSON.stringify({ type: "cry_detection", classification: result.classification, confidence: result.confidence });
            room.localParticipant.publishData(encoder.encode(cryPayload), { reliable: true });

            // Log cry event
            supabase.from("sleep_events").insert({
              user_id: userId!,
              room_name: roomName || "",
              event_type: "cry",
              intensity: result.confidence || 0.8,
            }).then(() => {});

            // Send push notification
            fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                userId: userId,
                roomName: roomName || "",
                alertType: "cry",
                message: `Baby is ${result.classification} in ${roomName?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}`,
              }),
            }).catch(() => {});
          }
        }).catch(() => {});
      });
    }
  }, [isMotionDetected, room, connectionState, motionLevel]);

  const startRecording = useCallback(() => {
    if (isRecording || !videoRef.current) return;
    const stream = videoRef.current.srcObject as MediaStream;
    if (!stream) return;
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    try {
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `babycam-motion-${ts}.${ext}`;
        const sizeMB = (blob.size / 1024 / 1024).toFixed(1);

        // CLOUD-FIRST: Always try Supabase upload first
        // Get fresh auth session for upload
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || userId;

        if (!currentUserId) {
          console.error("[Recording] No authenticated user — cannot upload to cloud");
          toast({ title: "Sign in required", description: "Please sign in to save recordings to cloud.", variant: "destructive" });
          return;
        }

        const filePath = `${currentUserId}/${fileName}`;

        // Check storage usage
        const { data: usageData } = await supabase
          .from("recordings")
          .select("file_size_bytes")
          .eq("user_id", currentUserId);
        const currentUsage = (usageData || []).reduce((sum, r) => sum + (r.file_size_bytes || 0), 0);

        if (currentUsage + blob.size > storageLimitBytes) {
          toast({ title: "Cloud storage full", description: `Limit reached (${sizeMB} MB). Delete old recordings or upgrade.`, variant: "destructive" });
          return;
        }

        toast({ title: "Uploading recording…", description: `${sizeMB} MB to cloud` });
        console.log(`[Recording] Uploading ${sizeMB} MB to cloud path: ${filePath}`);

        const { error: uploadError } = await supabase.storage
          .from("recordings")
          .upload(filePath, blob, { contentType: mimeType, upsert: false });

        if (uploadError) {
          console.error("[Recording] Cloud upload failed:", uploadError.message, uploadError);
          toast({ title: "Upload failed", description: `Error: ${uploadError.message}. Check your connection.`, variant: "destructive" });
          return;
        }

        // Save metadata to database
        const elapsed = recordingDurationMin * 60 - recordingTimeLeft;
        const { error: insertError } = await supabase.from("recordings").insert({
          user_id: currentUserId,
          room_name: roomName || "",
          file_path: filePath,
          file_size_bytes: blob.size,
          duration_seconds: elapsed > 0 ? elapsed : recordingDurationMin * 60,
          mime_type: mimeType,
          trigger_type: "motion",
        });

        if (insertError) {
          console.error("[Recording] Metadata insert failed:", insertError.message);
        }

        toast({ title: "Recording saved ☁️", description: `${sizeMB} MB uploaded to cloud` });
        console.log("[Recording] ✅ Cloud upload + metadata complete");
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTimeLeft(recordingDurationMin * 60);
      countdownRef.current = window.setInterval(() => {
        setRecordingTimeLeft((prev) => prev <= 1 ? 0 : prev - 1);
      }, 1000);
      recordingTimerRef.current = window.setTimeout(() => { stopRecording(); }, recordingDurationMin * 60 * 1000);
    } catch (err) { console.error("[Recording] Failed to start:", err); }
  }, [isRecording, recordingDurationMin, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false); setRecordingTimeLeft(0);
    if (recordingTimerRef.current) { clearTimeout(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  useEffect(() => {
    if (isMotionDetected && motionEnabled && !isRecording && connectionState === ConnectionState.Connected) startRecording();
  }, [isMotionDetected, motionEnabled, isRecording, connectionState, startRecording]);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Manual record handler
  const handleManualRecord = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      if (!isOnline) {
        toast({ title: "No internet", description: "Recordings require internet to save to cloud.", variant: "destructive" });
        return;
      }
      startRecording();
    }
  }, [isRecording, isOnline, startRecording, stopRecording, toast]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!room || connectionState !== ConnectionState.Connected) return;
    const attachVideo = () => {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (publication?.track && videoRef.current) {
        console.log("[CameraView] Attaching camera track to video element");
        publication.track.attach(videoRef.current);
      }
    };
    // Try immediately
    attachVideo();
    // Listen for both trackPublished (from enableCameraAndMicrophone) and localTrackPublished (from publishTrack)
    room.localParticipant.on("trackPublished", attachVideo);
    room.localParticipant.on("localTrackPublished", attachVideo);
    return () => {
      room.localParticipant.off("trackPublished", attachVideo);
      room.localParticipant.off("localTrackPublished", attachVideo);
    };
  }, [room, connectionState]);

  // AUTO-SHOW SHARE: When camera goes live, immediately show the share QR
  // so the user knows exactly what to do next — share the link to the viewer phone
  const sharedOnceRef = useRef(false);
  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      setElapsedTime(0);
      timerRef.current = window.setInterval(() => setElapsedTime((t) => t + 1), 1000);
      // Show share overlay automatically the FIRST time we go live
      if (!sharedOnceRef.current) {
        sharedOnceRef.current = true;
        setTimeout(() => setShowShareQR(true), 1500); // Brief delay so user sees "LIVE" first
      }
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
    stopRecording(); disconnect();
    await supabase.from("rooms").update({ is_active: false }).eq("room_name", roomName);
    navigate("/dashboard");
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const friendlyName = roomName?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ") || "Room";
  // Always use published URL so links work for everyone worldwide
  const appBase = "https://babycam.io";
  const viewerUrl = `${appBase}/viewer/${roomName}`;

  const copyViewerLink = () => {
    navigator.clipboard.writeText(viewerUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const nativeShare = () => {
    if (typeof navigator.share === "function") {
      navigator.share({
        title: `BabyCam - ${friendlyName}`,
        text: `Watch my baby camera live! Tap this link on your Android phone:`,
        url: viewerUrl,
      }).catch(() => {});
    } else {
      copyViewerLink();
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-black text-white select-none">
      <ShareSheet open={showShareQR} onOpenChange={setShowShareQR} url={viewerUrl} title={friendlyName} roomName={roomName} />
      <header className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={handleDisconnect} className="touch-target flex items-center gap-2"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-3">
          {isConnected && (
            <>
              <div className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                <span className="text-xs font-bold">LIVE</span>
                <span className="text-xs tabular-nums">{formatTime(elapsedTime)}</span>
              </div>
              {motionEnabled && isMotionDetected && (
                <div className="flex items-center gap-1.5 rounded-full bg-orange-500/90 px-3 py-1 animate-pulse">
                  <Activity className="h-3 w-3" /><span className="text-xs font-bold">MOTION</span>
                </div>
              )}
              {isRecording && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1">
                  <Circle className="h-3 w-3 fill-current animate-pulse" /><span className="text-xs font-bold">REC</span>
                  <span className="text-xs tabular-nums">{formatTime(recordingTimeLeft)}</span>
                </div>
              )}
            </>
          )}
          {isReconnecting && (
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-600/90 px-3 py-1">
              <Loader2 className="h-3 w-3 animate-spin" /><span className="text-xs font-bold">{t("camera.reconnecting")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2"><NetworkQualityIcon quality={networkQuality} /><QualityLabel quality={networkQuality} /></div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {isConnected && motionEnabled && (
          <div className="absolute top-2 left-2 right-2 z-10">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${isMotionDetected ? "bg-orange-500" : "bg-green-500/60"}`} style={{ width: `${Math.min(motionLevel * 5, 100)}%` }} />
            </div>
          </div>
        )}
        {isConnected && motionEnabled && !isRecording && (
          <div className="absolute top-5 right-3 z-10 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Auto-record</p>
            <p className="text-sm font-bold">{recordingDurationMin} min</p>
          </div>
        )}
        {audioOnly && isConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <Volume2 className="mb-3 h-16 w-16 text-[hsl(213,80%,70%)]" />
            <p className="text-lg font-semibold">{t("camera.audioOnlyMode")}</p>
            <p className="text-sm text-white/50">{t("camera.lowBandwidth")}</p>
          </div>
        )}
        {!isConnected && !isReconnecting && !cameraActive && (
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
            {error && (<div className="rounded-lg bg-red-500/20 px-4 py-2 text-center"><p className="text-sm text-red-300">{error}</p></div>)}
            <Button size="lg" onClick={async () => {
              if (error) { retry(); return; }
              try {
                console.log("[CameraView] Acquiring camera in direct click handler…");
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
                console.log("[CameraView] ✅ Camera acquired! Showing local preview…");
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                }
                setCameraActive(true);
                connect(stream);
              } catch (e: any) {
                console.error("[CameraView] getUserMedia failed:", e.message);
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                  if (videoRef.current) videoRef.current.srcObject = stream;
                  setCameraActive(true);
                  connect(stream);
                } catch {
                  connect();
                }
              }
            }} disabled={isConnecting} className="bg-[hsl(213,70%,55%)] hover:bg-[hsl(213,80%,70%)] text-white font-semibold px-10 touch-target">
              {isConnecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : error ? <RefreshCw className="mr-2 h-5 w-5" /> : <Video className="mr-2 h-5 w-5" />}
              {isConnecting ? t("camera.connecting") : error ? t("camera.retry") : t("camera.goLive")}
            </Button>
            <Button size="lg" onClick={() => setShowShareQR(true)} className="bg-white text-black hover:bg-white/90 font-semibold px-8 touch-target mt-3">
              <QrCode className="mr-2 h-5 w-5" /> Share Viewer Link
            </Button>
          </div>
        )}
        {/* Connecting overlay — camera is active but LiveKit still connecting */}
        {cameraActive && !isConnected && !isReconnecting && (
          <div className="absolute bottom-20 left-0 right-0 z-20 flex justify-center">
            <div className="rounded-xl bg-black/70 backdrop-blur-sm px-4 py-3 text-center max-w-xs">
              {isConnecting && (
                <div className="flex items-center gap-2 text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Connecting to stream server…</span>
                </div>
              )}
              {error && (
                <div className="text-center">
                  <p className="text-sm text-red-300 mb-2">{error}</p>
                  <Button size="sm" variant="outline" onClick={() => retry()} className="text-white border-white/30">
                    <RefreshCw className="h-3 w-3 mr-1" /> Retry
                  </Button>
                </div>
              )}
              {!isConnecting && !error && (
                <p className="text-sm text-yellow-300">Camera active — waiting for stream…</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-red-600 px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          No internet — recordings need a connection to save to cloud
        </div>
      )}

      {(isConnected || cameraActive) && (
        <div className="safe-bottom bg-gradient-to-t from-black/90 to-transparent px-6 pb-4 pt-6">
          <div className="flex items-center justify-center gap-5">
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
            <button onClick={() => setMotionEnabled(!motionEnabled)} className="touch-target flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${motionEnabled ? "bg-orange-500/80" : "bg-white/15"}`}>
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-[10px] opacity-60">{motionEnabled ? "Motion" : "No Motion"}</span>
            </button>
            {/* Manual Record Button */}
            <button onClick={handleManualRecord} className="touch-target flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isRecording ? "bg-red-500/80 animate-pulse" : "bg-white/15"}`}>
                <Circle className={`h-5 w-5 ${isRecording ? "fill-current" : ""}`} />
              </div>
              <span className="text-[10px] opacity-60">{isRecording ? `REC ${formatTime(recordingTimeLeft)}` : "Record"}</span>
            </button>
            {/* Share / QR Button */}
            <button onClick={() => setShowShareQR(true)} className="touch-target flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/80">
                <QrCode className="h-5 w-5" />
              </div>
              <span className="text-[10px] opacity-60">Share</span>
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
