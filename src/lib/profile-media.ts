import { supabase } from './supabase';

const PUBLIC_AVATAR_MARKER = '/storage/v1/object/public/avatars/';

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
