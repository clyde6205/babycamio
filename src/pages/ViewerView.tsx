import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Volume2, VolumeX, Wifi, WifiOff, Loader2, RefreshCw } from "lucide-react";

const ViewerView = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const [roomActive, setRoomActive] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(false);
  const [connectionType, setConnectionType] = useState<string>("unknown");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const nav = navigator as any;
    if (nav.connection) {
      setConnectionType(nav.connection.effectiveType || nav.connection.type || "unknown");
    }
  }, []);

  const checkRoom = async () => {
    setChecking(true);
    const { data } = await supabase
      .from("rooms")
      .select("is_active")
      .eq("room_name", roomName)
      .single();

    setRoomActive(data?.is_active ?? false);
    setChecking(false);
  };

  useEffect(() => {
    checkRoom();
    const interval = setInterval(checkRoom, 5000);
    return () => clearInterval(interval);
  }, [roomName]);

  const isLowBandwidth = ["slow-2g", "2g", "3g"].includes(connectionType);
  const NetworkIcon = isLowBandwidth ? WifiOff : Wifi;

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/dashboard")} className="touch-target flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2 text-xs">
          <NetworkIcon className="h-4 w-4" />
          <span className="uppercase">{connectionType}</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5">
        {checking ? (
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        ) : roomActive ? (
          <>
            {/* LiveKit viewer will be integrated here */}
            <div className="flex aspect-video w-full max-w-xl items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <div className="text-center">
                <Eye className="mx-auto mb-3 h-12 w-12 text-[hsl(213,80%,70%)]" />
                <p className="mb-1 font-semibold">Camera is Live</p>
                <p className="text-xs text-white/50">
                  {isLowBandwidth ? "Audio-only mode (low bandwidth)" : "Connecting to video stream..."}
                </p>
                <p className="mt-3 text-xs text-white/30">
                  LiveKit streaming will activate once credentials are configured
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
              <button onClick={() => setMuted(!muted)} className="touch-target flex flex-col items-center gap-1">
                {muted ? <VolumeX className="h-6 w-6 text-red-400" /> : <Volume2 className="h-6 w-6" />}
                <span className="text-[10px]">{muted ? "Unmute" : "Mute"}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <Eye className="mx-auto mb-4 h-16 w-16 text-white/20" />
            <h2 className="mb-2 text-xl font-semibold">Camera Offline</h2>
            <p className="mb-6 text-sm text-white/50">
              The camera for this room isn't broadcasting yet.
            </p>
            <Button onClick={checkRoom} variant="secondary" className="touch-target">
              <RefreshCw className="mr-2 h-4 w-4" /> Check Again
            </Button>
          </div>
        )}
      </div>

      <footer className="safe-bottom px-4 py-3 text-center text-xs text-white/30">
        {roomName?.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")} · BabyCam.io
      </footer>
    </div>
  );
};

export default ViewerView;
