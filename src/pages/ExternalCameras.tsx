import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import CopyrightFooter from "@/components/CopyrightFooter";

interface ExternalCamera {
  id: string;
  name: string;
  stream_url: string;
  protocol: string;
  thumbnail_url: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const PROTOCOL_OPTIONS = [
  { value: "mjpeg", label: "MJPEG Stream", desc: "Most IP cameras support this" },
  { value: "hls", label: "HLS (m3u8)", desc: "Modern cameras & NVR systems" },
  { value: "http", label: "HTTP Snapshot", desc: "Single image URL, auto-refreshed" },
  { value: "rtsp", label: "RTSP (via relay)", desc: "Requires local relay to HLS/MJPEG" },
];

/* ─── Stream viewer component ─── */
const StreamViewer = ({ camera }: { camera: ExternalCamera }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-muted/30 rounded-lg gap-2">
        <p className="text-sm text-muted-foreground">Stream unavailable</p>
        <Button size="sm" variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  if (camera.protocol === "mjpeg") {
    return (
      <img
        ref={imgRef}
        key={retryKey}
        src={camera.stream_url}
        alt={camera.name}
        className="w-full h-48 object-cover rounded-lg bg-black"
        onError={() => setError(true)}
      />
    );
  }

  if (camera.protocol === "http") {
    return (
      <HttpSnapshotViewer url={camera.stream_url} name={camera.name} retryKey={retryKey} onError={() => setError(true)} />
    );
  }

  if (camera.protocol === "hls") {
    return (
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-48 object-cover rounded-lg bg-black"
        onError={() => setError(true)}
      />
    );
  }

  // RTSP — show instructions
  return (
    <div className="flex flex-col items-center justify-center h-48 bg-muted/30 rounded-lg gap-2 p-4 text-center">
      <Info className="h-5 w-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        RTSP streams require a local relay (e.g. <strong>mediamtx</strong> or <strong>go2rtc</strong>) to convert to HLS/MJPEG. Update this camera's protocol once your relay is running.
      </p>
    </div>
  );
};

/* HTTP snapshot viewer — refreshes every 2s */
const HttpSnapshotViewer = ({ url, name, retryKey, onError }: { url: string; name: string; retryKey: number; onError: () => void }) => {
  const [src, setSrc] = useState(url + "?t=" + Date.now());

  useEffect(() => {
    const iv = setInterval(() => {
      setSrc(url + "?t=" + Date.now());
    }, 2000);
    return () => clearInterval(iv);
  }, [url, retryKey]);

  return (
    <img
      src={src}
      alt={name}
      className="w-full h-48 object-cover rounded-lg bg-black"
      onError={onError}
    />
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

  // Form state
  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [protocol, setProtocol] = useState("mjpeg");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
    const { error } = await supabase.from("external_cameras").insert({
      user_id: user.id,
      name: name.trim(),
      stream_url: streamUrl.trim(),
      protocol,
      notes: notes.trim() || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setName(""); setStreamUrl(""); setProtocol("mjpeg"); setNotes("");
      setDialogOpen(false);
      await fetchCameras();
      toast({ title: "Camera added" });
    }
    setSaving(false);
  };

  const toggleActive = async (cam: ExternalCamera) => {
    await supabase
      .from("external_cameras")
      .update({ is_active: !cam.is_active })
      .eq("id", cam.id);
    setCameras((prev) => prev.map((c) => (c.id === cam.id ? { ...c, is_active: !c.is_active } : c)));
  };

  const deleteCamera = async (id: string) => {
    await supabase.from("external_cameras").delete().eq("id", id);
    setCameras((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Camera removed" });
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
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect External Camera</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Camera Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Front Door, Nursery CCTV..." />
              </div>
              <div>
                <Label>Stream URL</Label>
                <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="http://192.168.1.100:8080/video" />
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
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Location, brand, model..." />
              </div>
              <Button onClick={addCamera} disabled={saving || !name.trim() || !streamUrl.trim()} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Camera
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
              <p>Supports <strong>MJPEG</strong>, <strong>HLS (m3u8)</strong>, and <strong>HTTP snapshot</strong> streams directly. For <strong>RTSP</strong> cameras, use a local relay like <a href="https://github.com/bluenviron/mediamtx" target="_blank" rel="noopener" className="text-primary underline">mediamtx</a> or <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener" className="text-primary underline">go2rtc</a> to convert to HLS/MJPEG.</p>
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
              <Card key={cam.id} className="overflow-hidden">
                {cam.is_active && <StreamViewer camera={cam} />}
                {!cam.is_active && (
                  <div className="flex items-center justify-center h-48 bg-muted/20 rounded-t-lg">
                    <PowerOff className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">{cam.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {cam.protocol}
                    </span>
                  </div>
                  {cam.notes && <p className="text-xs text-muted-foreground mb-2">{cam.notes}</p>}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleActive(cam)}>
                      {cam.is_active ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                      {cam.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCamera(cam.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CopyrightFooter variant="dark" showLinks={false} />
    </div>
  );
};

export default ExternalCameras;
