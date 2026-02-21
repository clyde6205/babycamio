import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CopyrightFooter from "@/components/CopyrightFooter";

interface AuthProps {
  mode: "login" | "signup";
}

const Auth = ({ mode }: AuthProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign out any existing anonymous session first
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user?.is_anonymous) {
        await supabase.auth.signOut();
      }

      if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        if (data.session) {
          navigate("/dashboard");
        } else {
          toast({ title: t("auth.checkEmail"), description: t("auth.checkEmailDesc") });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col brand-gradient text-primary-foreground">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="touch-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-[hsl(var(--brand-blue-light))]" />
            <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Baby<span className="text-[hsl(var(--brand-blue-light))]">Cam</span>.io
            </span>
          </div>
        </div>
        <LanguageSwitcher variant="light" />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-8">
        <div className="w-full max-w-sm">
          <h1 className="mb-2 text-2xl font-bold">
            {mode === "signup" ? t("auth.createAccount") : t("auth.welcomeBack")}
          </h1>
          <p className="mb-8 text-sm text-primary-foreground/60">
            {mode === "signup" ? t("auth.startMonitoring") : t("auth.signInDashboard")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-primary-foreground/80">{t("auth.displayName")}</Label>
                <Input id="name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("auth.yourName")} required className="border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-[hsl(var(--brand-blue))] touch-target" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-primary-foreground/80">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-[hsl(var(--brand-blue))] touch-target" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-primary-foreground/80">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-[hsl(var(--brand-blue))] touch-target" />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white font-semibold touch-target">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? t("auth.createBtn") : t("auth.signInBtn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-primary-foreground/50">
            {mode === "signup" ? (
              <>
                {t("auth.alreadyHaveAccount")}{" "}
                <button onClick={() => navigate("/login")} className="text-[hsl(var(--brand-blue-light))] underline">
                  {t("auth.signInLink")}
                </button>
              </>
            ) : (
              <>
                {t("auth.dontHaveAccount")}{" "}
                <button onClick={() => navigate("/signup")} className="text-[hsl(var(--brand-blue-light))] underline">
                  {t("auth.createOneLink")}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
      <CopyrightFooter variant="light" showLinks={false} />
    </div>
  );
};

export default Auth;
