import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Wrench, X } from "lucide-react";

const OPEN_PATHS = ["/login", "/admin", "/terms", "/privacy", "/disclaimer"];

/** Shows the founder's announcement and enforces maintenance mode (admins bypass). */
const AppGate = ({ children }: { children: React.ReactNode }) => {
  const { config } = useAppSettings();
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(() => sessionStorage.getItem("ann-dismissed"));

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      setIsAdmin(!!data?.length);
    });
  }, [pathname]);

  if (config.maintenance_mode && !isAdmin && !OPEN_PATHS.includes(pathname)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Wrench className="h-14 w-14 text-primary" />
        <h1 className="text-2xl font-bold">Under maintenance</h1>
        <p className="max-w-sm text-muted-foreground">{config.maintenance_message}</p>
      </div>
    );
  }

  const ann = config.announcement?.trim();
  const tone = config.announcement_level === "warning" ? "bg-destructive text-destructive-foreground"
    : config.announcement_level === "success" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground";

  return (
    <>
      {ann && dismissed !== ann && (
        <div className={`relative z-50 flex items-center justify-center gap-2 px-10 py-2 text-center text-sm font-medium ${tone}`}>
          {ann}
          <button className="absolute right-3" aria-label="Dismiss" onClick={() => { sessionStorage.setItem("ann-dismissed", ann); setDismissed(ann); }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {children}
    </>
  );
};

export default AppGate;
