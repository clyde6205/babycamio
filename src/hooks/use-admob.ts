import { useEffect, useCallback } from "react";
import { useSubscription } from "./use-subscription";

// AdMob Unit IDs — replace with your production IDs
const AD_UNIT_IDS = {
  banner: "ca-app-pub-3940256099942544/6300978111", // Test ID — replace with real
  interstitial: "ca-app-pub-3940256099942544/1033173712", // Test ID
};

let admobInitialized = false;

export function useAdMob() {
  const { isPro, loading } = useSubscription();

  const initAdMob = useCallback(async () => {
    if (admobInitialized || isPro) return;
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.initialize({
        initializeForTesting: true, // Set false in production
      });
      admobInitialized = true;
    } catch (err) {
      console.warn("AdMob init failed (expected in browser):", err);
    }
  }, [isPro]);

  const showBanner = useCallback(async () => {
    if (isPro) return;
    try {
      const { AdMob, BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
      await AdMob.showBanner({
        adId: AD_UNIT_IDS.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
    } catch (err) {
      console.warn("Banner ad failed:", err);
    }
  }, [isPro]);

  const hideBanner = useCallback(async () => {
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.hideBanner();
    } catch (err) {
      // Silently fail in browser
    }
  }, []);

  const showInterstitial = useCallback(async () => {
    if (isPro) return;
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.prepareInterstitial({ adId: AD_UNIT_IDS.interstitial });
      await AdMob.showInterstitial();
    } catch (err) {
      console.warn("Interstitial ad failed:", err);
    }
  }, [isPro]);

  useEffect(() => {
    if (!loading) {
      initAdMob();
    }
  }, [loading, initAdMob]);

  return { showBanner, hideBanner, showInterstitial, isPro, loading };
}
