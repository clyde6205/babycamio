import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

interface Props { placement?: string; className?: string }

interface Video { id: string; title: string; sponsor_name: string; click_url: string | null; storage_path: string; resolution: string }

/** Plays founder-uploaded sponsor videos at their original quality (up to 4K). */
const SponsorVideoPlayer = ({ placement = "dashboard", className }: Props) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [idx, setIdx] = useState(0);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("sponsor_videos" as any).select("*").eq("is_active", true)
      .in("placement", [placement, "all"]).order("sort_order")
      .then(({ data }) => setVideos((data as any) || []));
  }, [placement]);

  const current = videos[idx];
  useEffect(() => {
    if (!current) return;
    supabase.storage.from("sponsor-videos").createSignedUrl(current.storage_path, 60 * 60 * 6)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [current]);

  if (!current || !url) return null;

  return (
    <div className={`overflow-hidden rounded-xl border bg-card ${className || ""}`}>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
        <span>Sponsored{current.sponsor_name ? ` · ${current.sponsor_name}` : ""}</span>
        {current.resolution !== "auto" && <span className="rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary">{current.resolution.toUpperCase()}</span>}
      </div>
      <video
        key={url}
        src={url}
        controls
        playsInline
        muted
        autoPlay
        preload="metadata"
        className="aspect-video w-full bg-background"
        onEnded={() => videos.length > 1 && setIdx((i) => (i + 1) % videos.length)}
      />
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm font-medium">{current.title}</p>
        {current.click_url && (
          <a href={current.click_url} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center gap-1 text-xs font-semibold text-primary">
            Learn more <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
};

export default SponsorVideoPlayer;
