import { useEffect } from "react";
import { useAdMob } from "@/hooks/use-admob";

interface AdBannerProps {
  className?: string;
}

/**
 * Shows an AdMob banner ad for free-tier users.
 * On Capacitor/Android, it renders a native ad overlay at the bottom.
 * On web preview, it shows a placeholder.
 */
const AdBanner = ({ className }: AdBannerProps) => {
  const { showBanner, hideBanner, isPro, loading } = useAdMob();

  useEffect(() => {
    if (!loading && !isPro) {
      showBanner();
    }
    return () => {
      hideBanner();
    };
  }, [loading, isPro, showBanner, hideBanner]);

  // Don't render anything for Pro users
  if (loading || isPro) return null;

  // Web fallback placeholder (native ads render as overlay on Android)
  return (
    <div className={`bg-muted/50 border-t px-4 py-3 text-center ${className || ""}`}>
      <p className="text-xs text-muted-foreground">
        📢 Ad-supported · <span className="text-primary font-medium cursor-pointer" onClick={() => window.location.href = "/pricing"}>Upgrade to remove ads</span>
      </p>
    </div>
  );
};

export default AdBanner;
