import { useState } from "react";
import { Moon, Sun } from "lucide-react";

interface NightVisionToggleProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const NightVisionToggle = ({ videoRef }: NightVisionToggleProps) => {
  const [nightVision, setNightVision] = useState(false);

  const toggle = () => {
    const next = !nightVision;
    setNightVision(next);
    if (videoRef.current) {
      videoRef.current.style.filter = next
        ? "brightness(2.5) contrast(1.4) saturate(0) hue-rotate(90deg)"
        : "none";
    }
  };

  return (
    <button onClick={toggle} className="touch-target flex flex-col items-center gap-1.5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
        nightVision ? "bg-green-400/80 shadow-lg shadow-green-400/30" : "bg-white/15"
      }`}>
        {nightVision ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </div>
      <span className="text-[10px] opacity-60">{nightVision ? "Night" : "Day"}</span>
    </button>
  );
};

export default NightVisionToggle;
