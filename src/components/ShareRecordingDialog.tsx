import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Loader2, Copy, Check, UserPlus, Link2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SmsSender from "@/components/SmsSender";

interface ShareRecordingDialogProps {
  recordingId: string;
  recordingName: string;
  filePath: string;
}

const ShareRecordingDialog = ({ recordingId, recordingName, filePath }: ShareRecordingDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const generateShareLink = async () => {
    setGeneratingLink(true);
    try {
      // Create a signed URL valid for 7 days
      const { data, error } = await supabase.storage
        .from("recordings")
        .createSignedUrl(filePath, 7 * 24 * 60 * 60); // 7 days

      if (error) throw error;
      if (data?.signedUrl) {
        setShareLink(data.signedUrl);
      }
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: "Link copied!", description: "Share this link with family & friends. Expires in 7 days." });
  };

  const shareViaEmail = async () => {
    if (!email.trim()) return;
    setSharing(true);

    try {
      // Generate a signed URL for the recipient
      const { data, error } = await supabase.storage
        .from("recordings")
        .createSignedUrl(filePath, 7 * 24 * 60 * 60);

      if (error) throw error;

      // Use mailto: link as a simple share mechanism
      const subject = encodeURIComponent(`BabyCam Recording: ${recordingName}`);
      const body = encodeURIComponent(
        `Hi!\n\nI'm sharing a recording from BabyCam.io with you.\n\nWatch it here (link expires in 7 days):\n${data?.signedUrl}\n\nSent from BabyCam.io`
      );
      window.open(`mailto:${email.trim()}?subject=${subject}&body=${body}`, "_blank");

      setEmail("");
      toast({
        title: "Email share opened",
        description: `Share link prepared for ${email.trim()}`,
      });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !shareLink) generateShareLink();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Recording</DialogTitle>
          <DialogDescription>
            Share this clip with family & friends via link or email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share Link */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Share Link (expires in 7 days)
            </Label>
            {generatingLink ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : shareLink ? (
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="text-xs font-mono truncate"
                />
                <Button onClick={copyLink} size="icon" variant="outline" className="shrink-0">
                  {linkCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={generateShareLink} variant="outline" size="sm" className="w-full">
                <Link2 className="h-4 w-4 mr-2" /> Generate Share Link
              </Button>
            )}
          </div>

          {/* Share via Email */}
          <div className="space-y-2">
            <Label>Share via Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="family@example.com"
                onKeyDown={(e) => e.key === "Enter" && shareViaEmail()}
              />
              <Button onClick={shareViaEmail} disabled={sharing || !email.trim()} size="sm">
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Opens your email app with the share link pre-filled.
            </p>
          </div>

          {/* Share via SMS — Worldwide via Twilio + Local fallback */}
          {shareLink && (
            <SmsSender
              defaultMessage={`Check out this recording from BabyCam.io!\n\n${shareLink}`}
            />
          )}

          {/* Native Share (if available) */}
          {typeof navigator.share === "function" && shareLink && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                navigator.share({
                  title: `BabyCam Recording: ${recordingName}`,
                  text: "Check out this recording from BabyCam.io!",
                  url: shareLink,
                }).catch(() => {});
              }}
            >
              <Share2 className="h-4 w-4 mr-2" /> Share via Apps
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareRecordingDialog;
