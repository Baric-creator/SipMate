import { supabase } from './supabase';

const PUBLIC_AVATAR_MARKER = '/storage/v1/object/public/avatars/';
const SIGNED_AVATAR_MARKER = '/storage/v1/object/sign/avatars/';
const SIGNED_MEDIA_TTL_SECONDS = 5 * 60;
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    return null;
  }
})();

function decodeStoragePath(encodedPath: string) {
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

function storagePathFromSipMateUrl(reference: string) {
  let parsed: URL;
  try {
    parsed = new URL(reference);
  } catch {
    return null;
  }

  if (!SUPABASE_ORIGIN || parsed.origin !== SUPABASE_ORIGIN) return null;

  for (const marker of [PUBLIC_AVATAR_MARKER, SIGNED_AVATAR_MARKER]) {
    if (!parsed.pathname.startsWith(marker)) continue;
    const encodedPath = parsed.pathname.substring(marker.length);
    return encodedPath ? decodeStoragePath(encodedPath) : null;
  }

  return null;
}

export function getProfileMediaStoragePath(reference: string | null | undefined) {
  if (!reference) return null;

  const trimmed = reference.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return storagePathFromSipMateUrl(trimmed);
  }

  const normalized = trimmed.replace(/^\/+/, '').split('?')[0].split('#')[0];
  return normalized.includes('/') ? decodeStoragePath(normalized) : null;
}

export function getPublicProfileMediaUrl(storagePath: string, cacheBust?: number | string) {
  const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
  if (cacheBust == null) return data.publicUrl;
  return `${data.publicUrl}?t=${encodeURIComponent(String(cacheBust))}`;
}

/**
 * Resolve SipMate Storage media through an authenticated signed URL by default.
 * Public and already-signed SipMate avatar URLs are normalized back to their
 * Storage path first, but only when the URL belongs to the configured Supabase
 * project origin. External http(s) references are returned unchanged.
 */
export async function resolveProfileMediaUrl(
  reference: string | null | undefined,
  options?: { preferSigned?: boolean; expiresIn?: number }
) {
  if (!reference) return null;

  const storagePath = getProfileMediaStoragePath(reference);
  if (!storagePath) return reference;

  const preferSigned = options?.preferSigned ?? true;
  if (!preferSigned) return getPublicProfileMediaUrl(storagePath);

  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(storagePath, options?.expiresIn ?? SIGNED_MEDIA_TTL_SECONDS);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
