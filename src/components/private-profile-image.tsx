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
 * Any SipMate Storage reference is resolved through an authenticated signed URL.
 * External legacy URLs remain displayable, but SipMate public-object URLs are no
 * longer preferred by the client.
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
          preferSigned: true,
        });
        if (!cancelled) {
          setUri(resolved);
          if (!resolved) onUnavailable?.();
        }
      } catch (error) {
        if (__DEV__) console.warn('PROFILE MEDIA RESOLVE ERROR', error);
        if (!cancelled) {
          setUri(null);
          onUnavailable?.();
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
