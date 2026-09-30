import { useEffect } from "react";
import { useAdMob } from "@/hooks/use-admob";

interface AdBannerProps { className?: string }

/** AdMob banner for free users; hidden when the founder turns ads off or for Pro users. */
const AdBanner = ({ className }: AdBannerProps) => {
  const { showBanner, hideBanner, loading, adsOn, ads } = useAdMob();
  const active = !loading && adsOn && ads.banner_enabled;

  useEffect(() => {
    if (active) showBanner();
    return () => { hideBanner(); };
  }, [active, showBanner, hideBanner]);

  if (!active) return null;
  return (
    <div className={`bg-muted/50 border-t px-4 py-3 text-center ${className || ""}`}>
      <p className="text-xs text-muted-foreground">
        Ad-supported · <a href="/pricing" className="text-primary font-medium">Upgrade to remove ads</a>
      </p>
    </div>
  );
};

export default AdBanner;
