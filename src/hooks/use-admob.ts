import { useEffect, useCallback } from "react";
import { useSubscription } from "./use-subscription";
import { useAppSettings } from "./use-app-settings";

let admobInitialized = false;
let viewCount = 0;

/** AdMob controls, driven by the founder's Ads settings in the admin console. */
export function useAdMob() {
  const { isPro, loading: subLoading } = useSubscription();
  const { ads, loading: adsLoading } = useAppSettings();
  const loading = subLoading || adsLoading;
  const adsOn = ads.enabled && !isPro;

  const initAdMob = useCallback(async () => {
    if (admobInitialized || !adsOn) return;
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.initialize({ initializeForTesting: ads.test_mode });
      admobInitialized = true;
    } catch (err) {
      console.warn("AdMob init failed (expected in browser):", err);
    }
  }, [adsOn, ads.test_mode]);

  const showBanner = useCallback(async () => {
    if (!adsOn || !ads.banner_enabled) return;
    try {
      const { AdMob, BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
      await AdMob.showBanner({
        adId: ads.banner_unit_id,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: ads.banner_position === "top" ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: ads.test_mode,
      });
    } catch (err) {
      console.warn("Banner ad failed:", err);
    }
  }, [adsOn, ads]);

  const hideBanner = useCallback(async () => {
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.hideBanner();
    } catch { /* browser */ }
  }, []);

  const showInterstitial = useCallback(async () => {
    if (!adsOn || !ads.interstitial_enabled) return;
    viewCount++;
    if (viewCount % Math.max(1, ads.interstitial_every_n_views) !== 0) return;
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.prepareInterstitial({ adId: ads.interstitial_unit_id, isTesting: ads.test_mode });
      await AdMob.showInterstitial();
    } catch (err) {
      console.warn("Interstitial ad failed:", err);
    }
  }, [adsOn, ads]);

  useEffect(() => { if (!loading) initAdMob(); }, [loading, initAdMob]);

  return { showBanner, hideBanner, showInterstitial, isPro, loading, adsOn, ads };
}
