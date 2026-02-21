import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Play, CloudOff, Loader2, Film } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recording {
  id: string;
  room_name: string;
  file_path: string;
  file_size_bytes: number;
  duration_seconds: number;
  mime_type: string;
  trigger_type: string;
  created_at: string;
}

const Recordings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAutoAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("recordings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setRecordings(data);
      setLoading(false);
    };
    fetch();
  }, [user, authLoading]);

  const playRecording = async (rec: Recording) => {
    if (playingId === rec.id) {
      setPlayingId(null);
      setVideoUrl(null);
      return;
    }
    const { data } = await supabase.storage.from("recordings").createSignedUrl(rec.file_path, 3600);
    if (data?.signedUrl) {
      setVideoUrl(data.signedUrl);
      setPlayingId(rec.id);
    } else {
      toast({ title: "Failed to load recording", variant: "destructive" });
    }
  };

  const deleteRecording = async (rec: Recording) => {
    const { error: storageErr } = await supabase.storage.from("recordings").remove([rec.file_path]);
    if (storageErr) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    await supabase.from("recordings").delete().eq("id", rec.id);
    setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
    if (playingId === rec.id) { setPlayingId(null); setVideoUrl(null); }
    toast({ title: "Recording deleted" });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="touch-target">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Recordings</h1>
        <span className="ml-auto text-sm text-muted-foreground">{recordings.length} clips</span>
      </header>

      {playingId && videoUrl && (
        <div className="bg-black">
          <video src={videoUrl} controls autoPlay className="w-full max-h-[40vh] object-contain" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Film className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold">No recordings yet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Motion-triggered recordings will appear here
            </p>
          </div>
        ) : (
          recordings.map((rec) => {
            const date = new Date(rec.created_at);
            const roomLabel = rec.room_name.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ");
            return (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 transition-colors ${
                  playingId === rec.id ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium capitalize truncate">{roomLabel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground">{formatDuration(rec.duration_seconds)}</span>
                      <span className="text-xs text-muted-foreground">{formatSize(rec.file_size_bytes)}</span>
                      <span className="text-xs rounded-full bg-orange-500/10 text-orange-500 px-2 py-0.5 font-medium">
                        {rec.trigger_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant={playingId === rec.id ? "default" : "outline"}
                      className="h-9 w-9"
                      onClick={() => playRecording(rec)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteRecording(rec)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Recordings;
