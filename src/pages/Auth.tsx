import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthProps {
  mode: "login" | "signup";
}

const Auth = ({ mode }: AuthProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a verification link. Please confirm your email to continue.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col brand-gradient text-primary-foreground">
      <header className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => navigate("/")} className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-[hsl(var(--brand-blue-light))]" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-[hsl(var(--brand-blue-light))]">Cam</span>.io
          </span>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-8">
        <div className="w-full max-w-sm">
          <h1 className="mb-2 text-2xl font-bold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mb-8 text-sm text-primary-foreground/60">
            {mode === "signup"
              ? "Start monitoring in minutes"
              : "Sign in to your monitoring dashboard"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-primary-foreground/80">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-[hsl(var(--brand-blue))] touch-target"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-primary-foreground/80">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-[hsl(var(--brand-blue))] touch-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-primary-foreground/80">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-[hsl(var(--brand-blue))] touch-target"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-light))] text-white font-semibold touch-target"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-primary-foreground/50">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => navigate("/login")} className="text-[hsl(var(--brand-blue-light))] underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button onClick={() => navigate("/signup")} className="text-[hsl(var(--brand-blue-light))] underline">
                  Create one
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
