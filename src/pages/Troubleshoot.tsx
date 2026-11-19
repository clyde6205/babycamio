import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Wrench } from "lucide-react";

const Troubleshoot = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [context, setContext] = useState("");
  const [answer, setAnswer] = useState("");
  const [fail, setFail] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true); setAnswer(""); setFail("");
    const { data, error: err } = await supabase.functions.invoke("troubleshoot-error", { body: { error, context } });
    let msg = data?.error as string | undefined;
    if (err && !msg) {
      msg = err.message || "Could not reach the helper. Check your connection and try again.";
    }
    if (msg) setFail(msg); else setAnswer(data?.answer ?? "");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-semibold">Fix a viewer problem</h1>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          Did someone watching your camera see an error? Paste what their screen said and our AI helper will explain why and how to fix it.
        </p>
        <Card className="space-y-3 p-4">
          <label className="text-sm font-medium" htmlFor="err">Error message</label>
          <Textarea id="err" rows={7} maxLength={6000} value={error} onChange={(e) => setError(e.target.value)}
            placeholder="Paste the error text here…" />
          <label className="text-sm font-medium" htmlFor="ctx">How did they open the link? (optional)</label>
          <Input id="ctx" maxLength={500} value={context} onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. tapped it in WhatsApp on a Samsung phone" />
          <Button className="w-full" disabled={loading || error.trim().length < 3} onClick={run}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
            {loading ? "Checking…" : "Explain & fix"}
          </Button>
        </Card>
        {fail && <Card className="border-destructive p-4 text-sm text-destructive">{fail}</Card>}
        {answer && (
          <Card className="prose prose-sm dark:prose-invert max-w-none p-4">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Troubleshoot;
