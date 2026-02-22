import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SmsSenderProps {
  /** Pre-filled message body */
  defaultMessage: string;
  /** Label shown above the component */
  label?: string;
}

const SmsSender = ({ defaultMessage, label = "Send via SMS (Worldwide)" }: SmsSenderProps) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendSms = async () => {
    if (!phone.trim()) {
      toast({ title: "Phone number required", description: "Include country code, e.g. +1234567890", variant: "destructive" });
      return;
    }

    const cleanPhone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;

    setSending(true);
    setSent(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Not logged in", description: "Please log in first", variant: "destructive" });
        setSending(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { to: cleanPhone, message },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSent(true);
      toast({ title: "SMS Sent! ✓", description: `Message sent to ${cleanPhone}` });
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      const msg = err.message || "Failed to send SMS";
      if (msg.includes("not configured") || msg.includes("credentials")) {
        toast({
          title: "Twilio not configured",
          description: "Go to Settings → Twilio SMS to add your Account SID, Auth Token, and Phone Number.",
          variant: "destructive",
        });
      } else {
        toast({ title: "SMS Failed", description: msg, variant: "destructive" });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> {label}
      </Label>
      <Input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 234 567 8900"
        className="font-mono text-sm"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        maxLength={1600}
      />
      <div className="flex items-center gap-2">
        <Button
          onClick={sendSms}
          disabled={sending || !phone.trim()}
          size="sm"
          className="flex-1"
          variant={sent ? "secondary" : "default"}
        >
          {sending ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending...</>
          ) : sent ? (
            <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Sent!</>
          ) : (
            <><Send className="h-4 w-4 mr-1.5" /> Send SMS</>
          )}
        </Button>
        {/* Also offer local SMS fallback */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const smsBody = encodeURIComponent(message);
            const smsTo = phone.trim() ? phone.trim() : "";
            window.open(`sms:${smsTo}?body=${smsBody}`, "_self");
          }}
        >
          <MessageSquare className="h-4 w-4 mr-1" /> Local
        </Button>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> Requires Twilio configured in Settings. "Local" uses your phone's SMS app.
      </p>
    </div>
  );
};

export default SmsSender;
