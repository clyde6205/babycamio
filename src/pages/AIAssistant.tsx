import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bot, Send, Loader2, Settings2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const AI_MODELS = [
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash (Fast)", provider: "Google" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (Best)", provider: "Google" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano (Fast)", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI" },
  { id: "openai/gpt-5", name: "GPT-5 (Best)", provider: "OpenAI" },
  { id: "openai/gpt-5.2", name: "GPT-5.2 (Latest)", provider: "OpenAI" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const AIAssistant = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: allMessages, model }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${resp.status})`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally { setIsLoading(false); }
  };

  const currentModel = AI_MODELS.find((m) => m.id === model);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="touch-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("ai.title")}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className="touch-target">
          <Settings2 className="h-4 w-4" />
        </Button>
      </header>

      {showSettings && (
        <div className="border-b bg-muted/30 px-5 py-3">
          <div className="mx-auto max-w-2xl">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("ai.modelProvider")}</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{m.provider}</span>
                      {m.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {t("ai.currentlyUsing")} <strong>{currentModel?.provider}</strong> — {currentModel?.name}
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bot className="h-16 w-16 text-muted-foreground/30" />
              <h2 className="text-lg font-semibold text-muted-foreground">{t("ai.emptyTitle")}</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs">{t("ai.emptyDesc")}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {[t("ai.babySleepTips"), t("ai.convertFeet"), t("ai.normalTemp")].map((q) => (
                  <Button key={q} variant="outline" size="sm" onClick={() => setInput(q)} className="text-xs">{q}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <Card className={`max-w-[85%] p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </Card>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <Card className="bg-muted p-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></Card>
            </div>
          )}
        </div>
      </div>

      <div className="safe-bottom border-t bg-background px-5 py-3">
        <div className="mx-auto max-w-2xl flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("ai.askAnything")} className="touch-target" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} disabled={isLoading} />
          <Button onClick={send} disabled={isLoading || !input.trim()} className="touch-target">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-1.5">
          {currentModel?.provider} · {currentModel?.name}
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
