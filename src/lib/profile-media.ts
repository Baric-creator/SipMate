import { supabase } from './supabase';

const PUBLIC_AVATAR_MARKER = '/storage/v1/object/public/avatars/';
const SIGNED_MEDIA_TTL_SECONDS = 5 * 60;

export function getProfileMediaStoragePath(reference: string | null | undefined) {
  if (!reference) return null;

  const trimmed = reference.trim();
  if (!trimmed) return null;

  const markerIndex = trimmed.indexOf(PUBLIC_AVATAR_MARKER);
  if (markerIndex !== -1) {
    const encodedPath = trimmed
      .substring(markerIndex + PUBLIC_AVATAR_MARKER.length)
      .split('?')[0]
      .split('#')[0];

    try {
      return decodeURIComponent(encodedPath);
    } catch {
      return encodedPath;
    }
  }

  if (/^https?:\/\//i.test(trimmed)) return null;

  const normalized = trimmed.replace(/^\/+/, '');
  return normalized.includes('/') ? normalized : null;
}

export function getPublicProfileMediaUrl(storagePath: string, cacheBust?: number | string) {
  const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
  if (cacheBust == null) return data.publicUrl;
  return `${data.publicUrl}?t=${encodeURIComponent(String(cacheBust))}`;
}

/**
 * Resolve SipMate Storage media through an authenticated signed URL by default.
 * External http(s) references are returned unchanged because they are outside
 * SipMate Storage authorization. The explicit public option exists only for
 * transitional upload/write flows and must not be used for privacy-sensitive
 * profile rendering.
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
