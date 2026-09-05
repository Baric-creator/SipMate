export function isPremiumActive(
  isPremium: boolean | null | undefined,
  premiumUntil: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (isPremium !== true) return false;
  if (!premiumUntil) return true;

  const expiresAtMs = Date.parse(premiumUntil);
  if (!Number.isFinite(expiresAtMs)) return false;

  return expiresAtMs > nowMs;
}
