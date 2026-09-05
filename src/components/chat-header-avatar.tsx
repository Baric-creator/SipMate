import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrivateProfileImage } from './private-profile-image';

type ChatHeaderAvatarProps = {
  name?: string | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

export function ChatHeaderAvatar({ name, avatarPath, avatarUrl }: ChatHeaderAvatarProps) {
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
  const hasMedia = Boolean(avatarPath || avatarUrl);

  useEffect(() => {
    setMediaUnavailable(false);
  }, [avatarPath, avatarUrl]);

  if (!hasMedia || mediaUnavailable) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          {name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
    );
  }

  return (
    <PrivateProfileImage
      storagePath={avatarPath}
      legacyUrl={avatarUrl}
      onUnavailable={() => setMediaUnavailable(true)}
      style={styles.image}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  fallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#450A0A',
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
});
