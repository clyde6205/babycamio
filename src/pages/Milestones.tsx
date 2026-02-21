import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Check, Loader2, Baby, Calendar } from "lucide-react";

const MILESTONE_LIST = [
  { key: "first_smile", emoji: "😊", label: "First Smile", month: "1-2" },
  { key: "holds_head", emoji: "💪", label: "Holds Head Up", month: "2-4" },
  { key: "first_laugh", emoji: "😂", label: "First Laugh", month: "3-4" },
  { key: "rolls_over", emoji: "🔄", label: "Rolls Over", month: "4-6" },
  { key: "sits_up", emoji: "🪑", label: "Sits Up Alone", month: "5-7" },
  { key: "first_tooth", emoji: "🦷", label: "First Tooth", month: "5-10" },
  { key: "first_food", emoji: "🥣", label: "First Solid Food", month: "4-6" },
  { key: "crawls", emoji: "🐛", label: "Crawls", month: "6-10" },
  { key: "stands", emoji: "🧍", label: "Stands with Support", month: "8-12" },
  { key: "first_word", emoji: "🗣️", label: "First Word", month: "9-14" },
  { key: "waves_bye", emoji: "👋", label: "Waves Bye-Bye", month: "9-12" },
  { key: "claps_hands", emoji: "👏", label: "Claps Hands", month: "9-12" },
  { key: "first_steps", emoji: "🚶", label: "First Steps", month: "9-15" },
  { key: "walks_alone", emoji: "🏃", label: "Walks Independently", month: "12-18" },
  { key: "first_run", emoji: "💨", label: "First Run", month: "18-24" },
  { key: "uses_spoon", emoji: "🥄", label: "Uses Spoon", month: "12-18" },
  { key: "stacks_blocks", emoji: "🧱", label: "Stacks Blocks", month: "12-18" },
  { key: "two_word_phrases", emoji: "💬", label: "Two-Word Phrases", month: "18-24" },
  { key: "potty_trained", emoji: "🚽", label: "Potty Trained", month: "24-36" },
];

const Milestones = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAutoAuth();
  const { toast } = useToast();
  const [achieved, setAchieved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [babyName, setBabyName] = useState("");
  const [babyDob, setBabyDob] = useState("");
  const [creatingBaby, setCreatingBaby] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      // Get or create baby profile
      const { data: babies } = await supabase
        .from("baby_profiles")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);
      if (babies && babies.length > 0) {
        setBabyId(babies[0].id);
        setBabyName(babies[0].name);
        setBabyDob(babies[0].date_of_birth || "");
        // Load milestones
        const { data: ms } = await supabase
          .from("milestones")
          .select("milestone_key, achieved_at")
          .eq("baby_id", babies[0].id);
        if (ms) {
          const map: Record<string, string> = {};
          ms.forEach((m: any) => { map[m.milestone_key] = m.achieved_at; });
          setAchieved(map);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, authLoading]);

  const createBaby = async () => {
    if (!user || !babyName.trim()) return;
    setCreatingBaby(true);
    const { data, error } = await supabase
      .from("baby_profiles")
      .insert({ user_id: user.id, name: babyName.trim(), date_of_birth: babyDob || null })
      .select()
      .single();
    if (data) {
      setBabyId(data.id);
      toast({ title: `${babyName} added! 🎉` });
    }
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setCreatingBaby(false);
  };

  const toggleMilestone = async (key: string) => {
    if (!user || !babyId) return;
    if (achieved[key]) {
      // Remove
      await supabase.from("milestones").delete().eq("baby_id", babyId).eq("milestone_key", key);
      setAchieved((prev) => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("milestones").insert({
        user_id: user.id,
        baby_id: babyId,
        milestone_key: key,
        achieved_at: today,
      });
      setAchieved((prev) => ({ ...prev, [key]: today }));
      toast({ title: `🎉 Milestone achieved!` });
      if (navigator.vibrate) navigator.vibrate(100);
    }
  };

  const achievedCount = Object.keys(achieved).length;
  const progress = Math.round((achievedCount / MILESTONE_LIST.length) * 100);

  // Calculate baby age in months
  const babyAgeMonths = babyDob
    ? Math.floor((Date.now() - new Date(babyDob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="touch-target">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Milestones</h1>
        {babyAgeMonths !== null && (
          <span className="ml-auto text-xs text-muted-foreground">{babyAgeMonths} months old</span>
        )}
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !babyId ? (
          <Card className="p-6 text-center space-y-4">
            <Baby className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-lg font-bold">Add Your Baby</h2>
            <p className="text-sm text-muted-foreground">Track developmental milestones for your little one</p>
            <Input placeholder="Baby's name" value={babyName} onChange={(e) => setBabyName(e.target.value)} />
            <Input type="date" value={babyDob} onChange={(e) => setBabyDob(e.target.value)} />
            <Button onClick={createBaby} disabled={creatingBaby || !babyName.trim()} className="w-full touch-target">
              {creatingBaby ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Baby className="h-4 w-4 mr-2" />}
              Add {babyName || "Baby"}
            </Button>
          </Card>
        ) : (
          <>
            {/* Progress */}
            <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">{babyName}'s Progress</span>
                <span className="text-sm font-bold text-primary">{achievedCount}/{MILESTONE_LIST.length}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{progress}% of milestones achieved</p>
            </Card>

            {/* Milestone list */}
            <div className="space-y-2">
              {MILESTONE_LIST.map((ms) => {
                const isAchieved = !!achieved[ms.key];
                const isExpected = babyAgeMonths !== null && parseInt(ms.month.split("-")[0]) <= babyAgeMonths;
                return (
                  <button
                    key={ms.key}
                    onClick={() => toggleMilestone(ms.key)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all text-left ${
                      isAchieved
                        ? "bg-green-500/10 border border-green-500/30"
                        : isExpected
                        ? "bg-yellow-500/5 border border-yellow-500/20"
                        : "bg-muted/50 border border-transparent"
                    }`}
                  >
                    <span className="text-2xl">{ms.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isAchieved ? "text-green-600 dark:text-green-400" : ""}`}>
                        {ms.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Typical: {ms.month} months
                        {isAchieved && achieved[ms.key] && ` · Achieved ${new Date(achieved[ms.key]).toLocaleDateString()}`}
                      </p>
                    </div>
                    {isAchieved ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    ) : isExpected ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
                        <Star className="h-4 w-4 text-yellow-500" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/20" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Milestones;
