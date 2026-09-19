import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTRIBUTION_KEY = 'sipmate-growth-attribution-v1';

export type GrowthAttribution = {
  referralCode?: string;
  source?: string;
  capturedAt?: string;
};

function cleanReferral(value: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return /^[A-Z0-9_-]{3,32}$/.test(normalized) ? normalized : undefined;
}

function cleanSource(value: string | null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9._-]{1,80}$/.test(normalized) ? normalized : undefined;
}

export async function captureGrowthAttributionFromUrl(url: string | null | undefined) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    const referralCode = cleanReferral(parsed.searchParams.get('ref'));
    const source = cleanSource(parsed.searchParams.get('src'));
    if (!referralCode && !source) return;

    const current = await getGrowthAttribution();
    const next: GrowthAttribution = {
      referralCode: referralCode ?? current.referralCode,
      source: source ?? current.source,
      capturedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // Invalid deep links should never block app startup.
  }
}

export async function getGrowthAttribution(): Promise<GrowthAttribution> {
  try {
    const raw = await AsyncStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GrowthAttribution;
    return {
      referralCode: cleanReferral(parsed.referralCode ?? null),
      source: cleanSource(parsed.source ?? null),
      capturedAt: parsed.capturedAt,
    };
  } catch {
    return {};
  }
}

export async function clearGrowthAttribution() {
  await AsyncStorage.removeItem(ATTRIBUTION_KEY);
}

export function buildInviteUrl(inviteCode: string, source = 'app-share') {
  const code = cleanReferral(inviteCode);
  const src = cleanSource(source) ?? 'app-share';
  const url = new URL('https://officialsipmate.com/');
  if (code) url.searchParams.set('ref', code);
  url.searchParams.set('src', src);
  return url.toString();
}
