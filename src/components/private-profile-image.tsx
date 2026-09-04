import { useEffect, useRef, useState } from 'react';
import { Image, ImageProps } from 'react-native';

import { getProfileMediaStoragePath, resolveProfileMediaUrl } from '../lib/profile-media';

const SIGNED_MEDIA_REFRESH_MS = 4 * 60 * 1000;

type PrivateProfileImageProps = Omit<ImageProps, 'source'> & {
  storagePath?: string | null;
  legacyUrl?: string | null;
  onUnavailable?: () => void;
};

/**
 * Transitional image component for the public -> private avatars rollout.
 * Any SipMate Storage reference is resolved through an authenticated signed URL.
 * External legacy URLs remain displayable, but SipMate public-object URLs are no
 * longer preferred by the client. Signed SipMate URLs are refreshed before the
 * central five-minute expiry so long-lived screens do not lose their images.
 */
export function PrivateProfileImage({
  storagePath,
  legacyUrl,
  onUnavailable,
  ...imageProps
}: PrivateProfileImageProps) {
  const [uri, setUri] = useState<string | null>(null);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const reference = storagePath || legacyUrl;
    const managedStoragePath = getProfileMediaStoragePath(reference);

    async function resolve() {
      if (!reference) {
        setUri(null);
        onUnavailableRef.current?.();
        return;
      }

      try {
        const resolved = await resolveProfileMediaUrl(reference, {
          preferSigned: true,
        });
        if (cancelled) return;

        setUri(resolved);
        if (!resolved) {
          onUnavailableRef.current?.();
          return;
        }

        // Only SipMate-managed Storage objects need signature renewal.
        if (managedStoragePath) {
          refreshTimer = setTimeout(() => {
            void resolve();
          }, SIGNED_MEDIA_REFRESH_MS);
        }
      } catch (error) {
        if (__DEV__) console.warn('PROFILE MEDIA RESOLVE ERROR', error);
        if (!cancelled) {
          setUri(null);
          onUnavailableRef.current?.();
        }
      }
    }

    void resolve();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [storagePath, legacyUrl]);

  if (!uri) return null;
  return <Image {...imageProps} source={{ uri }} />;
}
