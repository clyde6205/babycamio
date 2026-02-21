import { useState, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { Room, Track } from "livekit-client";

interface TalkbackButtonProps {
  room: Room | null;
  isConnected: boolean;
}

const TalkbackButton = ({ room, isConnected }: TalkbackButtonProps) => {
  const [talkbackActive, setTalkbackActive] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const toggleTalkback = useCallback(async () => {
    if (!room || !isConnected) return;
    setIsPublishing(true);
    try {
      if (talkbackActive) {
        await room.localParticipant.setMicrophoneEnabled(false);
        setTalkbackActive(false);
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
        setTalkbackActive(true);
      }
    } catch (err) {
      console.error("[Talkback] Failed:", err);
    } finally {
      setIsPublishing(false);
    }
  }, [room, isConnected, talkbackActive]);

  if (!isConnected) return null;

  return (
    <button onClick={toggleTalkback} disabled={isPublishing} className="touch-target flex flex-col items-center gap-1.5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
        talkbackActive ? "bg-green-500/90 shadow-lg shadow-green-500/30 animate-pulse" : "bg-white/15"
      }`}>
        {talkbackActive ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </div>
      <span className="text-[10px] opacity-60">{talkbackActive ? "Talking" : "Talk"}</span>
    </button>
  );
};

export default TalkbackButton;
