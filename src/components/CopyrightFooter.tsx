import { Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CopyrightFooterProps {
  variant?: "light" | "dark";
  showLinks?: boolean;
}

const CopyrightFooter = ({ variant = "dark", showLinks = true }: CopyrightFooterProps) => {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const isLight = variant === "light";
  const textClass = isLight ? "text-primary-foreground/40" : "text-muted-foreground";
  const linkClass = isLight
    ? "text-primary-foreground/40 hover:text-primary-foreground/70 underline"
    : "text-muted-foreground hover:text-foreground underline";
  const borderClass = isLight ? "border-white/10" : "border-border";

  return (
    <footer className={`border-t ${borderClass} px-5 py-5 mt-auto`}>
      <div className="mx-auto max-w-5xl flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Video className={`h-4 w-4 ${isLight ? "text-primary-foreground/30" : "text-muted-foreground/50"}`} />
          <span className={`text-xs font-semibold tracking-tight ${isLight ? "text-primary-foreground/50" : "text-muted-foreground/70"}`}>
            Baby<span className="text-[hsl(var(--brand-blue))]">Cam</span>.io™
          </span>
        </div>
        <p className={`text-[11px] ${textClass}`}>
          © {year} BabyCam.io™ — All Rights Reserved. Patent Pending.
        </p>
        {showLinks && (
          <div className="flex gap-4">
            <button onClick={() => navigate("/terms")} className={`text-[11px] ${linkClass}`}>
              Terms
            </button>
            <button onClick={() => navigate("/privacy")} className={`text-[11px] ${linkClass}`}>
              Privacy
            </button>
            <button onClick={() => navigate("/disclaimer")} className={`text-[11px] ${linkClass}`}>
              Disclaimer
            </button>
          </div>
        )}
      </div>
    </footer>
  );
};

export default CopyrightFooter;
