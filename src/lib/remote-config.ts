import { supabase } from './supabase';

export type AppFeatureFlags = {
  premium: boolean;
  verified_photos: boolean;
  discord: boolean;
  nearby: boolean;
  founders_offer: boolean;
};

export type AppRemoteConfig = {
  phase: string;
  playStoreUrl: string | null;
  maintenanceMode: boolean;
  minAndroidVersionCode: number;
  featureFlags: AppFeatureFlags;
};

const defaults: AppRemoteConfig = {
  phase: 'waitlist',
  playStoreUrl: null,
  maintenanceMode: false,
  minAndroidVersionCode: 1,
  featureFlags: {
    premium: true,
    verified_photos: true,
    discord: true,
    nearby: true,
    founders_offer: true,
  },
};

export async function loadAppRemoteConfig(): Promise<AppRemoteConfig> {
  try {
    const { data, error } = await supabase.rpc('get_app_remote_config');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return defaults;
    const flags = row.feature_flags ?? {};
    return {
      phase: String(row.phase ?? defaults.phase),
      playStoreUrl: row.play_store_url ? String(row.play_store_url) : null,
      maintenanceMode: row.maintenance_mode === true,
      minAndroidVersionCode: Number(row.min_android_version_code ?? 1),
      featureFlags: {
        premium: flags.premium !== false,
        verified_photos: flags.verified_photos !== false,
        discord: flags.discord !== false,
        nearby: flags.nearby !== false,
        founders_offer: flags.founders_offer !== false,
      },
    };
  } catch (error) {
    console.log('REMOTE CONFIG ERROR:', error);
    return defaults;
  }
}
