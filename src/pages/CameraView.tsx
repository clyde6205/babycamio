import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, VideoOff, Mic, MicOff, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CameraView = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionType, setConnectionType] = useState<string>("unknown");

  // Detect network type
  useEffect(() => {
    const nav = navigator as any;
    if (nav.connection) {
      setConnectionType(nav.connection.effectiveType || nav.connection.type || "unknown");
      nav.connection.addEventListener?.("change", () => {
        setConnectionType(nav.connection.effectiveType || nav.connection.type || "unknown");
      });
    }
  }, []);

  const startCamera = async () => {
    setConnecting(true);
    try {
      // Adaptive constraints based on network
      const isLowBandwidth = ["slow-2g", "2g", "3g"].includes(connectionType);
      const constraints: MediaStreamConstraints = {
        video: isLowBandwidth
          ? { width: 320, height: 240, frameRate: 10 }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Mark room as active
      await supabase.from("rooms").update({ is_active: true }).eq("room_name", roomName);
      setConnected(true);

      toast({
        title: isLowBandwidth ? "Low bandwidth mode" : "Camera active",
        description: isLowBandwidth
          ? "Streaming at reduced quality for reliability"
          : "Streaming in HD — room is live",
      });
    } catch (err: any) {
      toast({
        title: "Camera error",
        description: err.message || "Could not access camera. Check permissions.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const stopCamera = async () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setConnected(false);
    await supabase.from("rooms").update({ is_active: false }).eq("room_name", roomName);
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setAudioEnabled(!audioEnabled);
    }
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const networkIcon = ["slow-2g", "2g", "3g"].includes(connectionType) ? WifiOff : Wifi;
  const NetworkIcon = networkIcon;

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => {
            stopCamera();
            navigate("/dashboard");
          }}
          className="touch-target flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2 text-xs">
          <NetworkIcon className="h-4 w-4" />
          <span className="uppercase">{connectionType}</span>
          {connected && <span className="h-2 w-2 rounded-full bg-green-500" />}
        </div>
      </header>

      {/* Video area */}
      <div className="relative flex flex-1 items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
            <Video className="h-16 w-16 text-[hsl(var(--brand-blue-light))]" />
            <p className="text-lg font-semibold">
              {roomName?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}
            </p>
            <Button
              size="lg"
              onClick={startCamera}
              disabled={connecting}
              className="bg-[hsl(213,70%,55%)] hover:bg-[hsl(213,80%,70%)] text-white touch-target"
            >
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
              Go Live
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      {connected && (
        <div className="safe-bottom flex items-center justify-center gap-6 bg-black/90 px-4 py-4">
          <button onClick={toggleVideo} className="touch-target flex flex-col items-center gap-1">
            {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6 text-red-400" />}
            <span className="text-[10px]">Video</span>
          </button>
          <button onClick={toggleAudio} className="touch-target flex flex-col items-center gap-1">
            {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6 text-red-400" />}
            <span className="text-[10px]">Audio</span>
          </button>
          <button
            onClick={stopCamera}
            className="touch-target flex h-14 w-14 items-center justify-center rounded-full bg-red-600"
          >
            <VideoOff className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraView;
