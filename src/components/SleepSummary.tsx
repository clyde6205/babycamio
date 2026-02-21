import { useMemo } from "react";
import { Moon, Sun, Baby, Activity, TrendingDown, TrendingUp, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SleepEvent {
  event_type: string;
  intensity: number;
  created_at: string;
}

interface SleepSummaryProps {
  events: SleepEvent[];
  dateLabel?: string;
}

const SleepSummary = ({ events, dateLabel }: SleepSummaryProps) => {
  const summary = useMemo(() => {
    const nightEvents = events.filter((e) => {
      const h = new Date(e.created_at).getHours();
      return h >= 20 || h < 8;
    });
    const dayEvents = events.filter((e) => {
      const h = new Date(e.created_at).getHours();
      return h >= 8 && h < 20;
    });

    const nightMotion = nightEvents.filter((e) => e.event_type === "motion").length;
    const nightCry = nightEvents.filter((e) => e.event_type === "cry").length;
    const totalNightEvents = nightMotion + nightCry;
    const totalDayEvents = dayEvents.filter((e) => e.event_type === "motion" || e.event_type === "cry").length;

    // Sleep score: fewer events = better sleep (0-100)
    const maxExpectedEvents = 20;
    const score = Math.max(0, Math.min(100, Math.round(100 - (totalNightEvents / maxExpectedEvents) * 100)));

    // Estimate quiet hours (12h night window, subtract ~15min per disturbance)
    const quietHoursEstimate = Math.max(0, 12 - totalNightEvents * 0.25);

    // Longest quiet stretch estimate
    const longestQuietStretch = totalNightEvents === 0 ? 12 : Math.max(1, 12 / (totalNightEvents + 1));

    const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";
    const gradeColor =
      score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
    const gradeEmoji = score >= 80 ? "😴" : score >= 60 ? "😐" : "😟";

    return {
      score, grade, gradeColor, gradeEmoji,
      nightMotion, nightCry, totalNightEvents,
      totalDayEvents, quietHoursEstimate, longestQuietStretch,
    };
  }, [events]);

  const handleShare = async () => {
    const text = `🌙 Sleep Report ${dateLabel || "Today"}\n\nSleep Score: ${summary.score}/100 (${summary.grade})\nQuiet Hours: ~${summary.quietHoursEstimate.toFixed(1)}h\nNight Disturbances: ${summary.totalNightEvents}\nCry Events: ${summary.nightCry}\n\nTracked with BabyCam.io 📱`;
    if (navigator.share) {
      await navigator.share({ title: "Sleep Report", text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-bold">Sleep Summary</h3>
          {dateLabel && <span className="text-xs text-muted-foreground">· {dateLabel}</span>}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleShare}>
          <Share2 className="h-3 w-3 mr-1" /> Share
        </Button>
      </div>

      {/* Score Circle */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-background/50 border-2 border-indigo-500/30">
          <div className="text-center">
            <span className="text-2xl">{summary.gradeEmoji}</span>
            <p className={`text-2xl font-black ${summary.gradeColor}`}>{summary.grade}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-400" />
            <span className="text-sm">~{summary.quietHoursEstimate.toFixed(1)}h quiet</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400" />
            <span className="text-sm">{summary.nightMotion} wake-ups</span>
          </div>
          <div className="flex items-center gap-2">
            <Baby className="h-4 w-4 text-red-400" />
            <span className="text-sm">{summary.nightCry} cry events</span>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-400" />
            <span className="text-sm">{summary.totalDayEvents} daytime events</span>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Sleep Score</span>
          <span className={`font-bold ${summary.gradeColor}`}>{summary.score}/100</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${summary.score}%`,
              background: summary.score >= 80 ? "hsl(142, 71%, 45%)" : summary.score >= 60 ? "hsl(48, 96%, 53%)" : "hsl(0, 72%, 51%)",
            }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        {summary.score >= 80
          ? "🌟 Great night! Baby slept well with minimal disturbances."
          : summary.score >= 60
          ? "😴 Decent rest but some disruptions. Check if room conditions are optimal."
          : "💛 Restless night. Consider adjusting bedtime routine or room temperature."}
      </p>
    </Card>
  );
};

export default SleepSummary;
