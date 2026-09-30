import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdsSettings {
  enabled: boolean;
  banner_enabled: boolean;
  interstitial_enabled: boolean;
  test_mode: boolean;
  banner_unit_id: string;
  interstitial_unit_id: string;
  interstitial_every_n_views: number;
  banner_position: "top" | "bottom";
}

export interface AppConfig {
  maintenance_mode: boolean;
  maintenance_message: string;
  announcement: string;
  announcement_level: "info" | "warning" | "success";
  signups_enabled: boolean;
  free_max_cameras: number;
  pro_max_cameras: number;
  min_app_version: string;
}

export const DEFAULT_ADS: AdsSettings = {
  enabled: true, banner_enabled: true, interstitial_enabled: false, test_mode: true,
  banner_unit_id: "ca-app-pub-3940256099942544/6300978111",
  interstitial_unit_id: "ca-app-pub-3940256099942544/1033173712",
  interstitial_every_n_views: 5, banner_position: "bottom",
};

export const DEFAULT_CONFIG: AppConfig = {
  maintenance_mode: false, maintenance_message: "BabyCam.io is getting an upgrade. Back shortly.",
  announcement: "", announcement_level: "info", signups_enabled: true,
  free_max_cameras: 1, pro_max_cameras: 10, min_app_version: "",
};

export function useAppSettings() {
  const q = useQuery({
    queryKey: ["app-settings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("setting_key, setting_value").in("setting_key", ["ads", "app_config"]);
      const map = Object.fromEntries((data || []).map((r: any) => [r.setting_key, r.setting_value]));
      return {
        ads: { ...DEFAULT_ADS, ...(map.ads || {}) } as AdsSettings,
        config: { ...DEFAULT_CONFIG, ...(map.app_config || {}) } as AppConfig,
      };
    },
  });
  return { ads: q.data?.ads ?? DEFAULT_ADS, config: q.data?.config ?? DEFAULT_CONFIG, loading: q.isLoading, refetch: q.refetch };
}
