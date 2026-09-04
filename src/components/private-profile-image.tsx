import { useEffect, useState } from 'react';
import { Image, ImageProps } from 'react-native';

import { resolveProfileMediaUrl } from '../lib/profile-media';

type PrivateProfileImageProps = Omit<ImageProps, 'source'> & {
  storagePath?: string | null;
  legacyUrl?: string | null;
  onUnavailable?: () => void;
};

/**
 * Transitional image component for the public -> private avatars rollout.
 * Prefer a database storage path and resolve it through an authenticated signed
 * URL. Legacy URLs remain a fallback until every supported client is migrated.
 */
export function PrivateProfileImage({
  storagePath,
  legacyUrl,
  onUnavailable,
  ...imageProps
}: PrivateProfileImageProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const reference = storagePath || legacyUrl;
      if (!reference) {
        setUri(null);
        onUnavailable?.();
        return;
      }

      try {
        const resolved = await resolveProfileMediaUrl(reference, {
          preferSigned: Boolean(storagePath),
        });
        if (!cancelled) {
          setUri(resolved);
          if (!resolved) onUnavailable?.();
        }
      } catch (error) {
        if (__DEV__) console.warn('PROFILE MEDIA RESOLVE ERROR', error);
        if (!cancelled) {
          // During rollout a legacy public URL is safe as a compatibility
          // fallback. Remove this fallback before the bucket-private cutover.
          setUri(legacyUrl ?? null);
          if (!legacyUrl) onUnavailable?.();
        }
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [storagePath, legacyUrl, onUnavailable]);

  if (!uri) return null;
  return <Image {...imageProps} source={{ uri }} />;
}
