type PremiumProfile = {
  is_premium?: boolean | null;
  premium_until?: string | null;
};

export function isPremiumProfileActive(profile: PremiumProfile | null | undefined, now = new Date()) {
  if (profile?.is_premium !== true) return false;
  if (!profile.premium_until) return true;
  const expiresAt = new Date(profile.premium_until);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
}
