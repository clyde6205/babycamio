import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Moon, Sun, Activity, Baby, TrendingUp, Loader2, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";

interface SleepEvent {
  id: string;
  event_type: string;
  intensity: number;
  created_at: string;
  room_name: string;
}

const SleepAnalytics = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAutoAuth();
  const [events, setEvents] = useState<SleepEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetch = async () => {
      const since = new Date();
      since.setDate(since.getDate() - selectedDays);
      const { data } = await supabase
        .from("sleep_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      if (data) setEvents(data);
      setLoading(false);
    };
    fetch();
  }, [user, authLoading, selectedDays]);

  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, "0")}:00`,
      motion: 0,
      cry: 0,
      quiet: 0,
    }));
    events.forEach((e) => {
      const h = new Date(e.created_at).getHours();
      if (e.event_type === "motion") hours[h].motion++;
      else if (e.event_type === "cry") hours[h].cry++;
      else hours[h].quiet++;
    });
    return hours;
  }, [events]);

  const dailySummary = useMemo(() => {
    const days: Record<string, { date: string; motionEvents: number; cryEvents: number; quietPeriods: number }> = {};
    events.forEach((e) => {
      const d = new Date(e.created_at).toLocaleDateString();
      if (!days[d]) days[d] = { date: d, motionEvents: 0, cryEvents: 0, quietPeriods: 0 };
      if (e.event_type === "motion") days[d].motionEvents++;
      else if (e.event_type === "cry") days[d].cryEvents++;
      else days[d].quietPeriods++;
    });
    return Object.values(days);
  }, [events]);

  const stats = useMemo(() => {
    const motionEvents = events.filter((e) => e.event_type === "motion").length;
    const cryEvents = events.filter((e) => e.event_type === "cry").length;
    const quietHours = events.filter((e) => e.event_type === "quiet").length;
    // Estimate sleep: quiet periods at night (8PM-8AM)
    const nightEvents = events.filter((e) => {
      const h = new Date(e.created_at).getHours();
      return h >= 20 || h < 8;
    });
    const nightQuiet = nightEvents.filter((e) => e.event_type !== "motion" && e.event_type !== "cry").length;
    return { motionEvents, cryEvents, quietHours, nightQuiet, totalEvents: events.length };
  }, [events]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="touch-target">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Sleep Analytics</h1>
        <div className="ml-auto flex gap-1">
          {[3, 7, 14, 30].map((d) => (
            <Button key={d} size="sm" variant={selectedDays === d ? "default" : "ghost"} className="h-7 text-xs" onClick={() => setSelectedDays(d)}>
              {d}d
            </Button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <Moon className="h-6 w-6 mx-auto text-indigo-400 mb-1" />
              <p className="text-2xl font-bold">{stats.nightQuiet}</p>
              <p className="text-xs text-muted-foreground">Quiet Night Periods</p>
            </Card>
            <Card className="p-4 text-center">
              <Activity className="h-6 w-6 mx-auto text-orange-400 mb-1" />
              <p className="text-2xl font-bold">{stats.motionEvents}</p>
              <p className="text-xs text-muted-foreground">Motion Events</p>
            </Card>
            <Card className="p-4 text-center">
              <Baby className="h-6 w-6 mx-auto text-red-400 mb-1" />
              <p className="text-2xl font-bold">{stats.cryEvents}</p>
              <p className="text-xs text-muted-foreground">Cry Detections</p>
            </Card>
            <Card className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-green-400 mb-1" />
              <p className="text-2xl font-bold">{stats.totalEvents}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </Card>
          </div>

          {/* Hourly Activity Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-400" /> Hourly Activity Pattern
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                <Bar dataKey="motion" fill="hsl(25, 95%, 53%)" name="Motion" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cry" fill="hsl(0, 84%, 60%)" name="Cry" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              💤 Dark hours (8PM-8AM) show nighttime activity
            </p>
          </Card>

          {/* Daily Trend */}
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Daily Trend
            </h3>
            {dailySummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailySummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Area type="monotone" dataKey="motionEvents" stroke="hsl(25, 95%, 53%)" fill="hsl(25, 95%, 53%, 0.2)" name="Motion" />
                  <Area type="monotone" dataKey="cryEvents" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%, 0.2)" name="Crying" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-8">
                No data yet. Start monitoring to see sleep patterns.
              </p>
            )}
          </Card>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="text-sm font-bold mb-1">💡 Sleep Tips</h3>
            <p className="text-xs text-muted-foreground">
              Consistent bedtime routines help babies sleep better. Fewer motion events at night indicates deeper sleep. Track trends over 7+ days for meaningful insights.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SleepAnalytics;
