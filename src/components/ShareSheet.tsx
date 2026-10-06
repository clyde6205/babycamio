import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Download, Mail, MessageCircle, MessageSquare, QrCode, Send, Share2, Facebook } from "lucide-react";
import EmailInvite from "@/components/EmailInvite";
import {
  brandedQrBlob, copyText, downloadBlob, facebookUrl, mailUrl, messengerUrl, openExternal,
  shareImage, shareLink, smsUrl, telegramUrl, whatsappUrl,
} from "@/lib/share";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  url: string;
  /** Short name shown on the QR picture, e.g. camera name */
  title: string;
  /** Message sent with the link */
  message?: string;
  /** Camera room name — when set (owner side), shows the server-sent email invitation block */
  roomName?: string;
}

/** One sharing hub used everywhere: QR first, then WhatsApp, Messenger, SMS, email, Telegram, copy. */
const ShareSheet = ({ open, onOpenChange, url, title, message, roomName }: Props) => {
  const { toast } = useToast();
  const qrWrap = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const text = message || `Watch my baby camera "${title}" live on BabyCam.io — tap the link, no download needed:`;
  const full = `${text}\n${url}`;
  const fileName = `babycam-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "camera"}-qr.png`;

  const getQr = async () => {
    const canvas = qrWrap.current?.querySelector("canvas");
    if (!canvas) throw new Error("QR not ready");
    return brandedQrBlob(canvas, title, url);
  };

  const sendQr = async () => {
    try {
      const shared = await shareImage(await getQr(), fileName, text, url);
      if (!shared) toast({ title: "QR code saved", description: "Your phone saved the picture — attach it in WhatsApp or any chat." });
    } catch (e: any) {
      toast({ title: "Couldn't share the QR code", description: e?.message, variant: "destructive" });
    }
  };

  const saveQr = async () => {
    downloadBlob(await getQr(), fileName);
    toast({ title: "QR code saved to your device" });
  };

  const copy = async () => {
    if (await copyText(url)) { setCopied(true); setTimeout(() => setCopied(false), 2000); toast({ title: "Link copied" }); }
  };

  const more = async () => { if (!(await shareLink("BabyCam.io", text, url))) copy(); };

  const apps = [
    { label: "WhatsApp", icon: MessageCircle, tone: "bg-success", go: () => openExternal(whatsappUrl(full, phone)) },
    { label: "Messenger", icon: MessageCircle, tone: "bg-primary", go: () => openExternal(messengerUrl(url)) },
    { label: "Facebook", icon: Facebook, tone: "bg-primary", go: () => openExternal(facebookUrl(url)) },
    { label: "SMS", icon: MessageSquare, tone: "bg-accent", go: () => openExternal(smsUrl(full, phone)) },
    { label: "Telegram", icon: Send, tone: "bg-accent", go: () => openExternal(telegramUrl(url, text)) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize"><QrCode className="h-5 w-5 text-primary" /> Share “{title}”</DialogTitle>
          <DialogDescription>Receivers scan or tap — the live view opens instantly in their browser. No app or account needed.</DialogDescription>
        </DialogHeader>

        {/* 1. QR code first */}
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4">
          <div ref={qrWrap} className="rounded-lg bg-white p-2" aria-label="QR code">
            <QRCodeCanvas value={url} size={200} level="H" marginSize={1} />
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button onClick={sendQr} className="h-11 bg-success text-success-foreground hover:bg-success/90">
              <MessageCircle className="mr-2 h-4 w-4" /> QR to WhatsApp
            </Button>
            <Button variant="outline" onClick={saveQr} className="h-11"><Download className="mr-2 h-4 w-4" /> Save QR</Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">“Send QR” opens your phone’s share menu — pick WhatsApp, Messenger or any chat.</p>
        </div>

        {/* 2. Apps */}
        <div className="space-y-2">
          <Input inputMode="tel" placeholder="Phone number (optional) e.g. +63 912…" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="grid grid-cols-5 gap-2">
            {apps.map(({ label, icon: Icon, tone, go }) => (
              <button key={label} onClick={go} className="flex flex-col items-center gap-1.5 rounded-xl p-2 hover:bg-muted active:bg-muted">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone} text-primary-foreground`}><Icon className="h-5 w-5" /></span>
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Email */}
        <div className="flex gap-2">
          <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button
            variant="secondary"
            onClick={() => openExternal(mailUrl(email.trim(), `Watch "${title}" live on BabyCam.io`, `Hi!\n\n${text}\n\n${url}\n\nOr scan the QR code in the BabyCam.io app.\n\nSent with BabyCam.io`))}
          >
            <Mail className="mr-1 h-4 w-4" /> Email
          </Button>
        </div>

        {/* 4. Copy / more */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={copy}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? "Copied" : "Copy link"}</Button>
          <Button variant="outline" onClick={more}><Share2 className="mr-2 h-4 w-4" /> More apps</Button>
        </div>
        <p className="break-all text-center font-mono text-[11px] text-muted-foreground">{url}</p>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSheet;
