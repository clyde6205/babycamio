import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Baby, Droplets, Thermometer, StickyNote, Plus, Loader2, Trash2, Clock,
} from "lucide-react";
import { SkeletonCard } from "@/components/SkeletonCard";

type LogType = "feeding" | "diaper" | "temperature" | "note";

interface CareLog {
  id: string;
  log_type: string;
  subtype: string | null;
  value: string | null;
  duration_minutes: number | null;
  notes: string | null;
  logged_at: string;
}

const LOG_ICONS: Record<string, any> = {
  feeding: Baby,
  diaper: Droplets,
  temperature: Thermometer,
  note: StickyNote,
};

const LOG_COLORS: Record<string, string> = {
  feeding: "text-blue-400",
  diaper: "text-yellow-400",
  temperature: "text-red-400",
  note: "text-green-400",
};

const SUBTYPES: Record<string, { label: string; value: string }[]> = {
  feeding: [
    { label: "🤱 Breast (L)", value: "breast_left" },
    { label: "🤱 Breast (R)", value: "breast_right" },
    { label: "🍼 Bottle", value: "bottle" },
    { label: "🥛 Formula", value: "formula" },
  ],
  diaper: [
    { label: "💧 Wet", value: "wet" },
    { label: "💩 Dirty", value: "dirty" },
    { label: "💧💩 Mixed", value: "mixed" },
  ],
};

const BabyCareLog = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAutoAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [logType, setLogType] = useState<LogType>("feeding");
  const [subtype, setSubtype] = useState("");
  const [value, setValue] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 2);
    const { data } = await supabase
      .from("baby_care_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false })
      .limit(50);
    if (data) setLogs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchLogs();
  }, [user, authLoading, fetchLogs]);

  const handleAdd = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("baby_care_logs").insert({
      user_id: user.id,
      log_type: logType,
      subtype: subtype || null,
      value: value || null,
      duration_minutes: duration ? parseInt(duration) : null,
      notes: notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Logged ✓" });
      setShowAdd(false);
      setSubtype("");
      setValue("");
      setDuration("");
      setNotes("");
      fetchLogs();
    }
    setSaving(false);
  };

  const deleteLog = async (id: string) => {
    await supabase.from("baby_care_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="touch-target">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Baby Care Log</h1>
        <Button size="sm" className="ml-auto touch-target" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Log
        </Button>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {showAdd && (
          <Card className="p-4 space-y-3 border-primary/30">
            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2">
              {(["feeding", "diaper", "temperature", "note"] as LogType[]).map((type) => {
                const Icon = LOG_ICONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => { setLogType(type); setSubtype(""); }}
                    className={`rounded-xl p-3 text-center transition-all ${
                      logType === type ? "bg-primary/20 border border-primary/40" : "bg-muted border border-transparent"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${LOG_COLORS[type]}`} />
                    <span className="text-[10px] capitalize">{type}</span>
                  </button>
                );
              })}
            </div>

            {/* Subtypes */}
            {SUBTYPES[logType] && (
              <div className="flex flex-wrap gap-2">
                {SUBTYPES[logType].map((st) => (
                  <button
                    key={st.value}
                    onClick={() => setSubtype(st.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                      subtype === st.value ? "bg-primary/20 border border-primary/40" : "bg-muted border border-transparent"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}

            {/* Value fields */}
            <div className="flex gap-2">
              {logType === "feeding" && (
                <Input
                  placeholder="Amount (ml/oz)"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="flex-1"
                />
              )}
              {logType === "feeding" && (
                <Input
                  placeholder="Duration (min)"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  type="number"
                  className="w-28"
                />
              )}
              {logType === "temperature" && (
                <Input
                  placeholder="Temperature (°F/°C)"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="flex-1"
                />
              )}
            </div>

            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button onClick={handleAdd} disabled={saving} className="w-full touch-target">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log Entry
            </Button>
          </Card>
        )}

        {/* Today's summary */}
        {!loading && logs.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(["feeding", "diaper", "temperature"] as const).map((type) => {
              const Icon = LOG_ICONS[type];
              const count = logs.filter(
                (l) => l.log_type === type && formatDate(l.logged_at) === "Today"
              ).length;
              return (
                <Card key={type} className="flex-shrink-0 p-3 text-center min-w-[80px]">
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${LOG_COLORS[type]}`} />
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{type}</p>
                </Card>
              );
            })}
          </div>
        )}

        {/* Log entries */}
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <Baby className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-semibold">No entries yet</p>
            <p className="text-sm text-muted-foreground">Start logging feedings, diapers, and more</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const Icon = LOG_ICONS[log.log_type] || StickyNote;
              return (
                <Card key={log.id} className="p-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted`}>
                    <Icon className={`h-5 w-5 ${LOG_COLORS[log.log_type] || "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold capitalize">{log.log_type}</span>
                      {log.subtype && (
                        <span className="text-xs text-muted-foreground">{log.subtype.replace("_", " ")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(log.logged_at)} {formatTime(log.logged_at)}</span>
                      {log.value && <span>· {log.value}</span>}
                      {log.duration_minutes && <span>· {log.duration_minutes}min</span>}
                    </div>
                    {log.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>}
                  </div>
                  <button onClick={() => deleteLog(log.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BabyCareLog;
