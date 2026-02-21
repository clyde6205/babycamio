import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, UserPlus, Users, Clock, Trash2, Loader2, Shield, Eye, Mic,
} from "lucide-react";
import CopyrightFooter from "@/components/CopyrightFooter";

interface CaregiverAccess {
  id: string;
  caregiver_email: string;
  caregiver_name: string | null;
  access_level: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

const ACCESS_LEVELS = [
  { value: "view", label: "View Only", icon: Eye, desc: "Can watch the camera feed" },
  { value: "view_talk", label: "View + Talk", icon: Mic, desc: "Can watch and use talkback" },
  { value: "full", label: "Full Access", icon: Shield, desc: "Full access to all features" },
];

const CaregiverMode = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAutoAuth();
  const { toast } = useToast();
  const [caregivers, setCaregivers] = useState<CaregiverAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [accessLevel, setAccessLevel] = useState("view");
  const [expiresHours, setExpiresHours] = useState(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("caregiver_access")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setCaregivers(data);
      setLoading(false);
    };
    load();
  }, [user, authLoading]);

  const addCaregiver = async () => {
    if (!user || !email.trim()) return;
    setSaving(true);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresHours);

    const { error } = await supabase.from("caregiver_access").insert({
      owner_id: user.id,
      caregiver_email: email.trim().toLowerCase(),
      caregiver_name: name.trim() || null,
      access_level: accessLevel,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Caregiver added ✓", description: `Access expires in ${expiresHours}h` });
      setShowAdd(false);
      setEmail("");
      setName("");
      // Refresh
      const { data } = await supabase.from("caregiver_access").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
      if (data) setCaregivers(data);
    }
    setSaving(false);
  };

  const removeCaregiver = async (id: string) => {
    await supabase.from("caregiver_access").delete().eq("id", id);
    setCaregivers((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Access removed" });
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const formatExpiry = (expiresAt: string) => {
    const exp = new Date(expiresAt);
    const now = new Date();
    if (exp < now) return "Expired";
    const diffH = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return "< 1h left";
    if (diffH < 24) return `${diffH}h left`;
    return `${Math.round(diffH / 24)}d left`;
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="touch-target">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Caregiver Mode</h1>
        <Button size="sm" className="ml-auto touch-target" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add
        </Button>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-xs text-muted-foreground">
            <Shield className="h-3 w-3 inline mr-1" />
            Grant temporary access to babysitters, grandparents, or nannies. Access automatically expires — they never see your account settings or recordings.
          </p>
        </Card>

        {showAdd && (
          <Card className="p-4 space-y-3 border-primary/30">
            <Input placeholder="Caregiver's email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="space-y-2">
              <p className="text-xs font-semibold">Access Level</p>
              {ACCESS_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setAccessLevel(level.value)}
                  className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all ${
                    accessLevel === level.value ? "bg-primary/10 border border-primary/30" : "bg-muted border border-transparent"
                  }`}
                >
                  <level.icon className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{level.label}</p>
                    <p className="text-xs text-muted-foreground">{level.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold">Expires after</p>
              <div className="flex gap-2">
                {[4, 8, 12, 24, 48].map((h) => (
                  <button
                    key={h}
                    onClick={() => setExpiresHours(h)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                      expiresHours === h ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={addCaregiver} disabled={saving || !email.trim()} className="w-full touch-target">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Grant Access
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : caregivers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-semibold">No caregivers added</p>
            <p className="text-sm text-muted-foreground">Add a babysitter or family member for temporary access</p>
          </div>
        ) : (
          <div className="space-y-2">
            {caregivers.map((cg) => {
              const expired = isExpired(cg.expires_at);
              return (
                <Card key={cg.id} className={`p-3 flex items-center gap-3 ${expired ? "opacity-50" : ""}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{cg.caregiver_name || cg.caregiver_email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{cg.access_level.replace("_", " + ")}</span>
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span className={expired ? "text-red-400" : "text-green-400"}>
                        {formatExpiry(cg.expires_at)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => removeCaregiver(cg.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <CopyrightFooter variant="dark" showLinks={false} />
    </div>
  );
};

export default CaregiverMode;
