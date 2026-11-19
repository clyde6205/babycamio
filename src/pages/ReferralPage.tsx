import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Gift, Copy, Check, Share2, Users, Crown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReferralRow = { id: string; referral_code: string; status: string; created_at: string };

const ReferralPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAutoAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setReferralCode(data[0].referral_code);
        setReferrals(data);
      } else {
        // Generate a new referral code
        const code = `BABY-${user.id.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await supabase.from("referrals").insert({ referrer_id: user.id, referral_code: code });
        setReferralCode(code);
      }
      setLoading(false);
    };
    load();
  }, [user, authLoading]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Referral code copied!" });
  };

  const shareCode = async () => {
    const link = `https://babycam.io/invite/${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BabyCam.io - Free Baby Monitor",
          text: `Try BabyCam.io — turn any phone into a baby monitor. Sign up with my invite and we both get 1 month Pro free!`,
          url: link,
        });
      } catch { /* user cancelled the share sheet */ }
    } else {
      navigator.clipboard.writeText(link);
      toast({ title: "Invite link copied!" });
    }
  };

  const completedReferrals = referrals.filter((r) => r.status === "completed" || r.status === "rewarded").length;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="touch-target"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-bold flex items-center gap-2"><Gift className="h-5 w-5 text-yellow-400" /> Refer & Earn</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Hero */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 text-center">
            <Gift className="h-16 w-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Invite Parents, Earn Pro!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Share your invite link. When a parent signs up with it, you BOTH get 1 month of Pro free — instantly!
            </p>
            <div className="rounded-xl bg-background border-2 border-dashed border-primary/30 p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
              <p className="text-2xl font-bold font-mono tracking-wider text-primary">{referralCode}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={copyCode}>
                {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                {copied ? "Copied!" : "Copy Code"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={shareCode}>
                <Share2 className="mr-1 h-4 w-4" /> Share
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{referrals.length}</p>
              <p className="text-[10px] text-muted-foreground">Invited</p>
            </Card>
            <Card className="p-3 text-center">
              <Check className="h-5 w-5 mx-auto text-green-400 mb-1" />
              <p className="text-lg font-bold">{completedReferrals}</p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </Card>
            <Card className="p-3 text-center">
              <Crown className="h-5 w-5 mx-auto text-yellow-400 mb-1" />
              <p className="text-lg font-bold">{completedReferrals}</p>
              <p className="text-[10px] text-muted-foreground">Months Earned</p>
            </Card>
          </div>

          {/* How it works */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">How It Works</h3>
            <div className="space-y-3">
              {[
                { step: "1", title: "Share your link", desc: "Send your invite link on Facebook, WhatsApp or SMS" },
                { step: "2", title: "They sign up", desc: "They create an account from your link" },
                { step: "3", title: "Both earn Pro!", desc: "You both get 1 month of Pro instantly 🎉" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReferralPage;
