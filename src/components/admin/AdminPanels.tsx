import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_ADS, DEFAULT_CONFIG, type AdsSettings, type AppConfig } from "@/hooks/use-app-settings";
import { Loader2, Save, Upload, Trash2, Eye, EyeOff, Film } from "lucide-react";

function useSetting<T>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(defaults);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  useEffect(() => {
    supabase.from("app_settings").select("setting_value").eq("setting_key", key).maybeSingle()
      .then(({ data }) => data?.setting_value && setValue({ ...defaults, ...(data.setting_value as any) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings")
      .upsert({ setting_key: key, setting_value: value as any, updated_by: user?.id } as any, { onConflict: "setting_key" });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved", description: "Live for all users now" }); qc.invalidateQueries({ queryKey: ["app-settings"] }); }
  };
  return { value, setValue, save, saving };
}

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
    <div><Label className="font-medium">{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
    {children}
  </div>
);

const SaveBtn = ({ onClick, saving }: { onClick: () => void; saving: boolean }) => (
  <Button onClick={onClick} disabled={saving} className="mt-4 w-full touch-target">
    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
  </Button>
);

export const AdsPanel = () => {
  const { value: a, setValue, save, saving } = useSetting<AdsSettings>("ads", DEFAULT_ADS);
  const set = (p: Partial<AdsSettings>) => setValue((v) => ({ ...v, ...p }));
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-1">Ads Control (AdMob)</h3>
      <p className="text-xs text-muted-foreground mb-3">Ads show only to Free users. Pro users never see ads.</p>
      <Row label="Ads enabled (master switch)"><Switch checked={a.enabled} onCheckedChange={(v) => set({ enabled: v })} /></Row>
      <Row label="Banner ads"><Switch checked={a.banner_enabled} onCheckedChange={(v) => set({ banner_enabled: v })} /></Row>
      <Row label="Banner position">
        <div className="flex gap-1">
          {(["top", "bottom"] as const).map((p) => (
            <Button key={p} size="sm" variant={a.banner_position === p ? "default" : "outline"} onClick={() => set({ banner_position: p })}>{p}</Button>
          ))}
        </div>
      </Row>
      <Row label="Full-screen ads" hint="Shown between screens"><Switch checked={a.interstitial_enabled} onCheckedChange={(v) => set({ interstitial_enabled: v })} /></Row>
      <Row label="Show full-screen ad every N screens">
        <Input type="number" min={1} max={50} className="w-20" value={a.interstitial_every_n_views} onChange={(e) => set({ interstitial_every_n_views: parseInt(e.target.value) || 1 })} />
      </Row>
      <Row label="Test mode" hint="Turn OFF only after adding your real AdMob IDs"><Switch checked={a.test_mode} onCheckedChange={(v) => set({ test_mode: v })} /></Row>
      <div className="space-y-2 pt-3">
        <Label>Banner ad unit ID</Label>
        <Input value={a.banner_unit_id} onChange={(e) => set({ banner_unit_id: e.target.value.trim() })} />
        <Label>Full-screen ad unit ID</Label>
        <Input value={a.interstitial_unit_id} onChange={(e) => set({ interstitial_unit_id: e.target.value.trim() })} />
      </div>
      <SaveBtn onClick={save} saving={saving} />
    </Card>
  );
};

export const AppConfigPanel = () => {
  const { value: c, setValue, save, saving } = useSetting<AppConfig>("app_config", DEFAULT_CONFIG);
  const set = (p: Partial<AppConfig>) => setValue((v) => ({ ...v, ...p }));
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">App Control</h3>
      <Row label="Maintenance mode" hint="Blocks the app for everyone except admins"><Switch checked={c.maintenance_mode} onCheckedChange={(v) => set({ maintenance_mode: v })} /></Row>
      <div className="py-3 border-b space-y-2">
        <Label>Maintenance message</Label>
        <Textarea value={c.maintenance_message} onChange={(e) => set({ maintenance_message: e.target.value })} />
      </div>
      <Row label="New sign-ups allowed"><Switch checked={c.signups_enabled} onCheckedChange={(v) => set({ signups_enabled: v })} /></Row>
      <div className="py-3 border-b space-y-2">
        <Label>Announcement banner (leave empty to hide)</Label>
        <Textarea value={c.announcement} onChange={(e) => set({ announcement: e.target.value })} placeholder="e.g. New feature: night vision boost!" />
        <div className="flex gap-1">
          {(["info", "success", "warning"] as const).map((l) => (
            <Button key={l} size="sm" variant={c.announcement_level === l ? "default" : "outline"} onClick={() => set({ announcement_level: l })}>{l}</Button>
          ))}
        </div>
      </div>
      <Row label="Max cameras — Free"><Input type="number" min={1} className="w-20" value={c.free_max_cameras} onChange={(e) => set({ free_max_cameras: parseInt(e.target.value) || 1 })} /></Row>
      <Row label="Max cameras — Pro"><Input type="number" min={1} className="w-20" value={c.pro_max_cameras} onChange={(e) => set({ pro_max_cameras: parseInt(e.target.value) || 1 })} /></Row>
      <SaveBtn onClick={save} saving={saving} />
    </Card>
  );
};

export const SponsorVideosPanel = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", sponsor_name: "", click_url: "", resolution: "4k", placement: "dashboard" });
  const [progress, setProgress] = useState<number | null>(null);

  const load = async () => {
    const { data } = await supabase.from("sponsor_videos" as any).select("*").order("created_at", { ascending: false });
    setVideos((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file || !form.title) { toast({ title: "Add a title and choose a video", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 ** 3) { toast({ title: "Video too large (max 5 GB)", variant: "destructive" }); return; }
    setProgress(0);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    // Auto-detect real resolution from the file
    const detected = await new Promise<string>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const h = Math.min(v.videoWidth, v.videoHeight) || 0;
        URL.revokeObjectURL(v.src);
        resolve(h >= 2000 ? "4k" : h >= 1400 ? "1440p" : h >= 1000 ? "1080p" : h >= 700 ? "720p" : "auto");
      };
      v.onerror = () => resolve(form.resolution || "auto");
      v.src = URL.createObjectURL(file);
    });
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    // Direct upload with real byte progress
    const error = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/sponsor-videos/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${session?.access_token}`);
      xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => resolve(xhr.status < 300 ? null : xhr.responseText || `HTTP ${xhr.status}`);
      xhr.onerror = () => resolve("Network error — check your connection and try again");
      xhr.send(file);
    });
    if (error) { setProgress(null); toast({ title: "Upload failed", description: error, variant: "destructive" }); return; }
    form.resolution = form.resolution === "auto" || !form.resolution ? detected : form.resolution;
    const { error: e2 } = await supabase.from("sponsor_videos" as any).insert({ ...form, click_url: form.click_url || null, storage_path: path, created_by: user?.id });
    setProgress(null);
    if (e2) { toast({ title: "Save failed", description: e2.message, variant: "destructive" }); return; }
    toast({ title: "Sponsor video published" });
    setFile(null); setForm({ ...form, title: "", sponsor_name: "", click_url: "" });
    load();
  };

  const toggle = async (v: any) => {
    await supabase.from("sponsor_videos" as any).update({ is_active: !v.is_active }).eq("id", v.id);
    load();
  };
  const remove = async (v: any) => {
    if (!confirm(`Delete "${v.title}"?`)) return;
    await supabase.storage.from("sponsor-videos").remove([v.storage_path]);
    await supabase.from("sponsor_videos" as any).delete().eq("id", v.id);
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Film className="h-4 w-4 text-primary" /> Upload Sponsor Video</h3>
        <p className="text-xs text-muted-foreground">MP4 (H.264/H.265) or WebM, up to 5 GB. Played at the sponsor's original quality — 4K, 2K/3K or HD.</p>
        <Input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file && <p className="text-xs text-muted-foreground">{file.name} · {(file.size / 1048576).toFixed(1)} MB</p>}
        <Input placeholder="Video title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Sponsor name" value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} />
        <Input placeholder="Sponsor link (https://…)" value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} />
        <div className="flex flex-wrap gap-1">
          <span className="text-xs self-center mr-1">Quality:</span>
          {["4k", "3k", "2k", "1080p", "auto"].map((r) => (
            <Button key={r} size="sm" variant={form.resolution === r ? "default" : "outline"} onClick={() => setForm({ ...form, resolution: r })}>{r}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="text-xs self-center mr-1">Show on:</span>
          {["dashboard", "viewer", "recordings", "all"].map((p) => (
            <Button key={p} size="sm" variant={form.placement === p ? "default" : "outline"} onClick={() => setForm({ ...form, placement: p })}>{p}</Button>
          ))}
        </div>
        {progress !== null && <Progress value={progress} />}
        {progress !== null && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="text-xs text-muted-foreground text-right">{progress}% uploaded</p>
          </div>
        )}
        <Button onClick={upload} disabled={progress !== null} className="w-full touch-target">
          {progress !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload & Publish
        </Button>
      </Card>
      {videos.map((v) => (
        <Card key={v.id} className="p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{v.title}</p>
            <p className="text-xs text-muted-foreground">{v.sponsor_name || "—"} · {v.resolution.toUpperCase()} · {v.placement} · {v.is_active ? "Live" : "Hidden"}</p>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" onClick={() => toggle(v)} title={v.is_active ? "Hide" : "Show"}>{v.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            <Button size="icon" variant="destructive" onClick={() => remove(v)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}
      {videos.length === 0 && <p className="py-6 text-center text-muted-foreground text-sm">No sponsor videos yet.</p>}
    </div>
  );
};
