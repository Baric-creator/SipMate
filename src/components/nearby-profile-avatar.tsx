import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrivateProfileImage } from './private-profile-image';

type NearbyProfileAvatarProps = {
  name?: string | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

export function NearbyProfileAvatar({ name, avatarPath, avatarUrl }: NearbyProfileAvatarProps) {
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
  const hasMedia = Boolean(avatarPath || avatarUrl);

  useEffect(() => {
    setMediaUnavailable(false);
  }, [avatarPath, avatarUrl]);

  if (!hasMedia || mediaUnavailable) {
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name?.charAt(0).toUpperCase() || '?'}</Text>
      </View>
    );
  }

  return (
    <PrivateProfileImage
      storagePath={avatarPath}
      legacyUrl={avatarUrl}
      onUnavailable={() => setMediaUnavailable(true)}
      style={styles.avatarImage}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#450A0A',
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
});
