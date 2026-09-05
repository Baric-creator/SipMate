import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrivateProfileImage } from './private-profile-image';

type UserProfileAvatarProps = {
  name?: string | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

export function UserProfileAvatar({ name, avatarPath, avatarUrl }: UserProfileAvatarProps) {
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
  const hasMedia = Boolean(avatarPath || avatarUrl);

  useEffect(() => {
    setMediaUnavailable(false);
  }, [avatarPath, avatarUrl]);

  if (!hasMedia || mediaUnavailable) {
    return (
      <View style={styles.profileAvatarFallback}>
        <Text style={styles.profileAvatarFallbackText}>
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
      style={styles.profileAvatar}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  profileAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 18,
    backgroundColor: '#27272A',
    borderWidth: 3,
    borderColor: '#DC2626',
  },
  profileAvatarFallback: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 18,
    backgroundColor: '#450A0A',
    borderWidth: 3,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
  },
});
