import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gift, Video, Shield, Mic } from "lucide-react";

/** Public, shareable invite page: stores the code and sends the visitor to sign up. */
const Invite = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (code) localStorage.setItem("babycam_ref", code.toUpperCase());
    document.title = "You're invited to BabyCam.io — 1 month Pro free";
  }, [code]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">A friend invited you to BabyCam.io</h1>
        <p className="text-muted-foreground">Sign up with this invite and you both get <strong className="text-foreground">1 month of Pro free</strong>.</p>
        <ul className="text-left space-y-3 rounded-xl border bg-card p-4 text-sm">
          <li className="flex gap-2"><Video className="w-4 h-4 text-primary" /> Live HD video from any phone</li>
          <li className="flex gap-2"><Mic className="w-4 h-4 text-primary" /> Cry detection and two-way talk</li>
          <li className="flex gap-2"><Shield className="w-4 h-4 text-primary" /> Private and encrypted</li>
        </ul>
        <p className="font-mono text-sm text-muted-foreground">Invite code: {code.toUpperCase()}</p>
        <Button size="lg" className="w-full" onClick={() => navigate("/signup")}>Accept invite & sign up</Button>
        <button className="text-sm text-muted-foreground underline" onClick={() => navigate("/login")}>I already have an account</button>
      </div>
    </main>
  );
};

export default Invite;
