import { Card } from "@/components/ui/card";
import { Video, Eye, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Room {
  id: string;
  room_name: string;
  is_active: boolean;
  room_type: string;
}

interface MultiCameraGridProps {
  rooms: Room[];
}

const MultiCameraGrid = ({ rooms }: MultiCameraGridProps) => {
  const navigate = useNavigate();
  const activeRooms = rooms.filter((r) => r.is_active);

  if (activeRooms.length < 2) return null;

  return (
    <Card className="p-4 mb-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Multi-Camera View</h3>
        <span className="ml-auto text-xs text-muted-foreground">{activeRooms.length} live</span>
      </div>
      <div className={`grid gap-2 ${activeRooms.length <= 2 ? "grid-cols-2" : activeRooms.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
        {activeRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => navigate(`/viewer/${room.room_name}`)}
            className="relative rounded-xl bg-black/80 aspect-video flex items-center justify-center border border-border overflow-hidden hover:border-primary/50 transition-colors"
          >
            <div className="absolute top-1 left-1 flex items-center gap-1 rounded-full bg-green-600/80 px-2 py-0.5 z-10">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[8px] font-bold text-white">LIVE</span>
            </div>
            <Eye className="h-6 w-6 text-white/30" />
            <p className="absolute bottom-1 left-1 right-1 text-[9px] text-white/60 truncate capitalize text-center">
              {room.room_name.replace(/-[a-z0-9]+$/, "").replace(/-/g, " ")}
            </p>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">Tap any room to view full screen</p>
    </Card>
  );
};

export default MultiCameraGrid;
