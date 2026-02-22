import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Cctv,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Info,
  Maximize2,
  Minimize2,
  Camera,
  Share2,
  Settings,
  Wifi,
  WifiOff,
  Circle,
  Download,
  Edit,
  Check,
  X,
} from "lucide-react";
import ShareDialog from "@/components/ShareDialog";
import CopyrightFooter from "@/components/CopyrightFooter";

interface ExternalCamera {
  id: string;
  name: string;
  stream_url: string;
  protocol: string;
  thumbnail_url: string | null;
  is_active: boolean;
  notes: string | null;
  room_id: string | null;
  created_at: string;
}

const PROTOCOL_OPTIONS = [
  { value: "mjpeg", label: "MJPEG Stream", desc: "Most IP cameras support this" },
  { value: "hls", label: "HLS (m3u8)", desc: "Modern cameras & NVR systems" },
  { value: "http", label: "HTTP Snapshot", desc: "Single image URL, auto-refreshed" },
  { value: "rtsp", label: "RTSP (via relay)", desc: "Requires local relay to HLS/MJPEG" },
];

/* ─── Stream health checker ─── */
const useStreamHealth = (url: string, protocol: string, isActive: boolean) => {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (!isActive || protocol === "rtsp") {
      setStatus("offline");
      return;
    }
    setStatus("checking");

    // For HTTP/MJPEG, try to load as image
    if (protocol === "http" || protocol === "mjpeg") {
      const img = new Image();
      img.onload = () => { setStatus("online"); setLastChecked(new Date()); };
      img.onerror = () => { setStatus("offline"); setLastChecked(new Date()); };
      img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
    } else {
      // HLS: try fetch HEAD
      fetch(url, { method: "HEAD", mode: "no-cors" })
        .then(() => { setStatus("online"); setLastChecked(new Date()); })
        .catch(() => { setStatus("offline"); setLastChecked(new Date()); });
    }

    // Re-check every 30s
    const iv = setInterval(() => {
      if (protocol === "http" || protocol === "mjpeg") {
        const img = new Image();
        img.onload = () => { setStatus("online"); setLastChecked(new Date()); };
        img.onerror = () => { setStatus("offline"); setLastChecked(new Date()); };
        img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
      } else {
        fetch(url, { method: "HEAD", mode: "no-cors" })
          .then(() => { setStatus("online"); setLastChecked(new Date()); })
          .catch(() => { setStatus("offline"); setLastChecked(new Date()); });
      }
    }, 30000);

    return () => clearInterval(iv);
  }, [url, protocol, isActive]);

  return { status, lastChecked };
};

/* ─── Stream viewer component ─── */
const StreamViewer = ({
  camera,
  fullscreen = false,
  onSnapshot,
}: {
  camera: ExternalCamera;
  fullscreen?: boolean;
  onSnapshot?: (blob: Blob) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setError(false);
  }, [camera.stream_url, retryKey]);

  // HLS playback
  useEffect(() => {
    if (camera.protocol !== "hls" || !videoRef.current) return;
    let hls: any = null;

    const initHls = async () => {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported() && videoRef.current) {
        hls = new Hls({ enableWorker: false });
        hls.loadSource(camera.stream_url);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.ERROR, () => setError(true));
      } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = camera.stream_url;
      }
    };
    initHls();
    return () => hls?.destroy();
  }, [camera.protocol, camera.stream_url, retryKey]);

  // Snapshot capture
  const captureSnapshot = useCallback(() => {
    if (!canvasRef.current || !onSnapshot) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let source: HTMLImageElement | HTMLVideoElement | null = null;
    if (camera.protocol === "hls" && videoRef.current) {
      source = videoRef.current;
    } else if (imgRef.current) {
      source = imgRef.current;
    }
    if (!source) return;

    canvas.width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    canvas.height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
    if (canvas.width === 0 || canvas.height === 0) return;

    ctx.drawImage(source, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onSnapshot(blob);
    }, "image/jpeg", 0.9);
  }, [camera.protocol, onSnapshot]);

  // Expose capture via parent
  useEffect(() => {
    (window as any).__captureSnapshot = captureSnapshot;
    return () => { delete (window as any).__captureSnapshot; };
  }, [captureSnapshot]);

  const heightClass = fullscreen ? "h-full" : "h-48";

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center ${heightClass} bg-muted/30 rounded-lg gap-2`}>
        <WifiOff className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Stream unavailable</p>
        <Button size="sm" variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  if (camera.protocol === "mjpeg") {
    return (
      <>
        <canvas ref={canvasRef} className="hidden" />
        <img
          ref={imgRef}
          key={retryKey}
          src={camera.stream_url}
          alt={camera.name}
          className={`w-full ${heightClass} object-cover rounded-lg bg-black`}
          crossOrigin="anonymous"
          onError={() => setError(true)}
        />
      </>
    );
  }

  if (camera.protocol === "http") {
    return (
      <>
        <canvas ref={canvasRef} className="hidden" />
        <HttpSnapshotViewer
          ref={imgRef}
          url={camera.stream_url}
          name={camera.name}
          retryKey={retryKey}
          onError={() => setError(true)}
          heightClass={heightClass}
        />
      </>
    );
  }

  if (camera.protocol === "hls") {
    return (
      <>
        <canvas ref={canvasRef} className="hidden" />
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full ${heightClass} object-cover rounded-lg bg-black`}
          onError={() => setError(true)}
        />
      </>
    );
  }

  // RTSP — show instructions
  return (
    <div className={`flex flex-col items-center justify-center ${heightClass} bg-muted/30 rounded-lg gap-2 p-4 text-center`}>
      <Info className="h-5 w-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        RTSP streams require a local relay (e.g. <strong>mediamtx</strong> or <strong>go2rtc</strong>) to convert to HLS/MJPEG.
        Update this camera's protocol once your relay is running.
      </p>
    </div>
  );
};

/* HTTP snapshot viewer — refreshes every 2s */
const HttpSnapshotViewer = React.forwardRef<
  HTMLImageElement,
  { url: string; name: string; retryKey: number; onError: () => void; heightClass: string }
>(({ url, name, retryKey, onError, heightClass }, ref) => {
  const [src, setSrc] = useState(url + "?t=" + Date.now());

  useEffect(() => {
    const iv = setInterval(() => {
      setSrc(url + "?t=" + Date.now());
    }, 2000);
    return () => clearInterval(iv);
  }, [url, retryKey]);

  return (
    <img
      ref={ref}
      src={src}
      alt={name}
      className={`w-full ${heightClass} object-cover rounded-lg bg-black`}
      crossOrigin="anonymous"
      onError={onError}
    />
  );
});
HttpSnapshotViewer.displayName = "HttpSnapshotViewer";



/* ─── Fullscreen Camera Viewer ─── */
const FullscreenViewer = ({
  camera,
  userId,
  onClose,
}: {
  camera: ExternalCamera;
  userId: string | null;
  onClose: () => void;
}) => {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const { isPro } = useSubscription();
  const storageLimitBytes = isPro ? 10 * 1024 * 1024 * 1024 : 500 * 1024 * 1024;

  const toggleNativeFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsNativeFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsNativeFullscreen(false);
    }
  };

  const takeSnapshot = async () => {
    if (!userId) {
      toast({ title: "Sign in required", description: "Log in to save snapshots.", variant: "destructive" });
      return;
    }

    // Use the global captureSnapshot function
    const captureAndSave = () => {
      return new Promise<Blob | null>((resolve) => {
        // Create a temporary canvas and capture from the stream viewer
        const imgs = containerRef.current?.querySelectorAll("img, video");
        if (!imgs || imgs.length === 0) { resolve(null); return; }

        const source = imgs[0] as HTMLImageElement | HTMLVideoElement;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }

        canvas.width = source instanceof HTMLVideoElement ? source.videoWidth || 1920 : source.naturalWidth || 1920;
        canvas.height = source instanceof HTMLVideoElement ? source.videoHeight || 1080 : source.naturalHeight || 1080;
        if (canvas.width === 0) { resolve(null); return; }

        ctx.drawImage(source, 0, 0);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      });
    };

    const blob = await captureAndSave();
    if (!blob) {
      toast({ title: "Snapshot failed", description: "Could not capture frame from stream.", variant: "destructive" });
      return;
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `cctv-snapshot-${camera.name.replace(/\s+/g, "-")}-${ts}.jpg`;
    const filePath = `${userId}/${fileName}`;
    const sizeMB = (blob.size / 1024 / 1024).toFixed(1);

    // Check storage
    const { data: usageData } = await supabase
      .from("recordings")
      .select("file_size_bytes")
      .eq("user_id", userId);
    const currentUsage = (usageData || []).reduce((sum, r) => sum + (r.file_size_bytes || 0), 0);
    if (currentUsage + blob.size > storageLimitBytes) {
      toast({ title: "Storage full", description: "Delete old recordings or upgrade.", variant: "destructive" });
      return;
    }

    toast({ title: "Saving snapshot…", description: `${sizeMB} MB` });

    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    await supabase.from("recordings").insert({
      user_id: userId,
      room_name: camera.room_id ? `cctv-${camera.name.toLowerCase().replace(/\s+/g, "-")}` : "external",
      file_path: filePath,
      file_size_bytes: blob.size,
      duration_seconds: 0,
      mime_type: "image/jpeg",
      trigger_type: "snapshot",
    });

    toast({ title: "Snapshot saved ☁️", description: `${sizeMB} MB uploaded` });
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="touch-target flex items-center gap-2 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-green-600/80 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold text-white">LIVE</span>
          </div>
          <span className="text-xs text-white/60 uppercase tracking-wider">{camera.protocol}</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <Cctv className="h-4 w-4 text-white/60" />
        </div>
      </div>

      {/* Stream */}
      <div className="flex-1 flex items-center justify-center">
        <StreamViewer camera={camera} fullscreen />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent px-6 pb-6 pt-8">
        <div className="flex items-center justify-center gap-5">
          <button onClick={takeSnapshot} className="touch-target flex flex-col items-center gap-1.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] text-white/60">Snapshot</span>
          </button>
          <button onClick={toggleNativeFullscreen} className="touch-target flex flex-col items-center gap-1.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              {isNativeFullscreen ? <Minimize2 className="h-5 w-5 text-white" /> : <Maximize2 className="h-5 w-5 text-white" />}
            </div>
            <span className="text-[10px] text-white/60">Fullscreen</span>
          </button>
          <button onClick={onClose} className="touch-target flex flex-col items-center gap-1.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/30">
              <X className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] text-white/60">Close</span>
          </button>
        </div>
        <div className="mt-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/30">
            {camera.name} · CCTV · BabyCam.io
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── Camera Card ─── */
const CameraCard = ({
  cam,
  userId,
  onToggleActive,
  onDelete,
  onEdit,
}: {
  cam: ExternalCamera;
  userId: string | null;
  onToggleActive: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const { status } = useStreamHealth(cam.stream_url, cam.protocol, cam.is_active);

  return (
    <>
      {fullscreen && (
        <FullscreenViewer camera={cam} userId={userId} onClose={() => setFullscreen(false)} />
      )}
      <Card className="overflow-hidden">
        {/* Stream preview */}
        {cam.is_active ? (
          <div className="relative cursor-pointer" onClick={() => setFullscreen(true)}>
            <StreamViewer camera={cam} />
            {/* Status badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              {status === "online" ? (
                <div className="flex items-center gap-1 rounded-full bg-green-600/80 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[8px] font-bold text-white">LIVE</span>
                </div>
              ) : status === "checking" ? (
                <div className="flex items-center gap-1 rounded-full bg-yellow-600/80 px-2 py-0.5">
                  <Loader2 className="h-2 w-2 text-white animate-spin" />
                  <span className="text-[8px] font-bold text-white">CHECKING</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-full bg-red-600/80 px-2 py-0.5">
                  <WifiOff className="h-2 w-2 text-white" />
                  <span className="text-[8px] font-bold text-white">OFFLINE</span>
                </div>
              )}
            </div>
            {/* Tap to expand hint */}
            <div className="absolute bottom-2 right-2">
              <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5">
                <Maximize2 className="h-2.5 w-2.5 text-white/70" />
                <span className="text-[8px] text-white/70">Tap to view</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-muted/20 rounded-t-lg">
            <PowerOff className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Info & controls */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-sm truncate">{cam.name}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {cam.protocol}
              </span>
            </div>
            {/* Share button — only if linked to a room */}
            {cam.room_id && userId && (
              <ShareDialog roomId={cam.room_id} roomName={`cctv-${cam.name.toLowerCase().replace(/\s+/g, "-")}`} userId={userId} />
            )}
          </div>
          {cam.notes && <p className="text-xs text-muted-foreground mb-2">{cam.notes}</p>}
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setFullscreen(true)} disabled={!cam.is_active}>
              <Maximize2 className="h-3 w-3 mr-1" /> View
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onToggleActive}>
              {cam.is_active ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
              {cam.is_active ? "Disable" : "Enable"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
};

/* ─── Main page ─── */
const ExternalCameras = () => {
  const navigate = useNavigate();
  const { user } = useAutoAuth();
  const { toast } = useToast();
  const [cameras, setCameras] = useState<ExternalCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<ExternalCamera | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [protocol, setProtocol] = useState("mjpeg");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName(""); setStreamUrl(""); setProtocol("mjpeg"); setNotes("");
    setEditingCamera(null);
  };

  const fetchCameras = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("external_cameras")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCameras(data as ExternalCamera[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchCameras();
  }, [user]);

  const addCamera = async () => {
    if (!name.trim() || !streamUrl.trim() || !user) return;
    setSaving(true);

    try {
      if (editingCamera) {
        // Update existing camera
        const { error } = await supabase.from("external_cameras").update({
          name: name.trim(),
          stream_url: streamUrl.trim(),
          protocol,
          notes: notes.trim() || null,
        }).eq("id", editingCamera.id);

        if (error) throw error;
        toast({ title: "Camera updated" });
      } else {
        // Create a room entry for the external camera
        const roomSlug = "cctv-" + name.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
        const { data: roomData, error: roomError } = await supabase.from("rooms").insert({
          room_name: roomSlug,
          owner_id: user.id,
          room_type: "cctv",
        }).select("id").single();

        if (roomError) throw roomError;

        // Create the external camera linked to the room
        const { error } = await supabase.from("external_cameras").insert({
          user_id: user.id,
          name: name.trim(),
          stream_url: streamUrl.trim(),
          protocol,
          notes: notes.trim() || null,
          room_id: roomData.id,
        });

        if (error) throw error;
        toast({ title: "Camera added" });
      }

      resetForm();
      setDialogOpen(false);
      await fetchCameras();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (cam: ExternalCamera) => {
    await supabase
      .from("external_cameras")
      .update({ is_active: !cam.is_active })
      .eq("id", cam.id);

    // Also update the room's is_active status
    if (cam.room_id) {
      await supabase.from("rooms").update({ is_active: !cam.is_active }).eq("id", cam.room_id);
    }

    setCameras((prev) => prev.map((c) => (c.id === cam.id ? { ...c, is_active: !c.is_active } : c)));
  };

  const deleteCamera = async (cam: ExternalCamera) => {
    // Delete the camera
    await supabase.from("external_cameras").delete().eq("id", cam.id);
    // Also clean up the linked room
    if (cam.room_id) {
      await supabase.from("rooms").delete().eq("id", cam.room_id);
    }
    setCameras((prev) => prev.filter((c) => c.id !== cam.id));
    toast({ title: "Camera removed" });
  };

  const startEdit = (cam: ExternalCamera) => {
    setEditingCamera(cam);
    setName(cam.name);
    setStreamUrl(cam.stream_url);
    setProtocol(cam.protocol);
    setNotes(cam.notes || "");
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Cctv className="h-5 w-5 text-primary" />
          <span className="font-bold">External Cameras</span>
          {cameras.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {cameras.filter(c => c.is_active).length}/{cameras.length} active
            </span>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCamera ? "Edit Camera" : "Connect External Camera"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Camera Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Front Door, Nursery CCTV, Office..." />
              </div>
              <div>
                <Label>Stream URL</Label>
                <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="http://192.168.1.100:8080/video" />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in your camera's web interface or manual
                </p>
              </div>
              <div>
                <Label>Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTOCOL_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="font-medium">{p.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {p.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Location, brand, model, login details..." rows={2} />
              </div>
              <Button onClick={addCamera} disabled={saving || !name.trim() || !streamUrl.trim()} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : editingCamera ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {editingCamera ? "Save Changes" : "Add Camera"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        {/* Info banner */}
        <Card className="mb-6 p-4 border-primary/20 bg-primary/5">
          <div className="flex gap-3 items-start">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Connect your existing CCTV or IP cameras</p>
              <p className="mb-2">
                External cameras integrate fully — <strong>share with viewers</strong>, take <strong>snapshots saved to cloud</strong>,
                view <strong>fullscreen</strong>, and appear in your <strong>multi-camera grid</strong>.
              </p>
              <p>
                Supports <strong>MJPEG</strong>, <strong>HLS (m3u8)</strong>, and <strong>HTTP snapshot</strong> streams directly. For <strong>RTSP</strong> cameras, use a local relay like{" "}
                <a href="https://github.com/bluenviron/mediamtx" target="_blank" rel="noopener" className="text-primary underline">mediamtx</a> or{" "}
                <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener" className="text-primary underline">go2rtc</a> to convert to HLS/MJPEG.
              </p>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cameras.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <Cctv className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-1 text-lg font-semibold">No external cameras</h3>
            <p className="mb-4 text-sm text-muted-foreground">Connect your CCTV, IP cameras, or NVR to monitor from here.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Camera
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cameras.map((cam) => (
              <CameraCard
                key={cam.id}
                cam={cam}
                userId={user?.id || null}
                onToggleActive={() => toggleActive(cam)}
                onDelete={() => deleteCamera(cam)}
                onEdit={() => startEdit(cam)}
              />
            ))}
          </div>
        )}
      </main>

      <CopyrightFooter variant="dark" showLinks={false} />
    </div>
  );
};

export default ExternalCameras;
