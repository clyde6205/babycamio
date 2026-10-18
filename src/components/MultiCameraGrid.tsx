import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Cctv, Eye, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Room {
  id: string;
  room_name: string;
  is_active: boolean;
  room_type: string;
}

interface ExternalCam {
  id: string;
  name: string;
  stream_url: string;
  protocol: string;
  is_active: boolean;
  room_id: string | null;
}

interface MultiCameraGridProps {
  rooms: Room[];
}

const MultiCameraGrid = ({ rooms }: MultiCameraGridProps) => {
  const navigate = useNavigate();
  const [externalCams, setExternalCams] = useState<ExternalCam[]>([]);

  useEffect(() => {
    const fetchExternal = async () => {
      const { data } = await supabase
        .from("external_cameras")
        .select("id, name, stream_url, protocol, is_active, room_id")
        .eq("is_active", true);
      if (data) setExternalCams(data as ExternalCam[]);
    };
    void fetchExternal();
  }, []);

  const activeRooms = rooms.filter((r) => r.is_active && r.room_type !== "cctv");
  const totalActive = activeRooms.length + externalCams.length;
  if (totalActive < 2) return null;

  const allItems = [
    ...activeRooms.map((r) => ({ type: "room" as const, id: r.id, name: r.room_name })),
    ...externalCams.map((c) => ({ type: "cctv" as const, id: c.id, name: c.name, protocol: c.protocol, streamUrl: c.stream_url })),
  ];

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Multi-Camera View</h3>
        <span className="ml-auto text-xs text-muted-foreground">{totalActive} live</span>
      </div>
      <div className={`grid gap-2 ${totalActive <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {allItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.type === "room" ? navigate(`/viewer/${item.id}`) : navigate("/external-cameras")}
            className="relative flex aspect-video min-h-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-black/80 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="absolute left-1 top-1 z-10 flex items-center gap-1 rounded-full bg-green-600/80 px-2 py-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              <span className="text-[8px] font-bold text-white">LIVE</span>
            </div>
            {item.type === "cctv" && (
              <div className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded-full bg-primary/80 px-2 py-0.5">
                <Cctv className="h-2 w-2 text-white" />
                <span className="text-[8px] font-bold text-white">CCTV</span>
              </div>
            )}
            {item.type === "cctv" && (item.protocol === "mjpeg" || item.protocol === "http") ? (
              <img
                src={`${item.streamUrl}${item.streamUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`}
                alt={item.name}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <Eye className="h-6 w-6 text-white/30" />
            )}
            {item.type === "room" && <Eye className="h-6 w-6 text-white/30" />}
            <p className="absolute bottom-1 left-1 right-1 truncate text-center text-[9px] capitalize text-white/60">
              {item.type === "room" ? item.name.replace(/-[a-z0-9]+$/i, "").replace(/-/g, " ") : item.name}
            </p>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Tap any camera to view full screen</p>
    </Card>
  );
};

export default MultiCameraGrid;
