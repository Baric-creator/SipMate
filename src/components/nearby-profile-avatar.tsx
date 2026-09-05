import { StyleSheet, Text, View } from 'react-native';

import { PrivateProfileImage } from './private-profile-image';

type NearbyProfileAvatarProps = {
  name?: string | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

export function NearbyProfileAvatar({
  name,
  avatarPath,
  avatarUrl,
}: NearbyProfileAvatarProps) {
  const initial = name?.charAt(0).toUpperCase() || '?';

  if (!avatarPath && !avatarUrl) {
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    );
  }

  return (
    <View style={styles.avatar}>
      <PrivateProfileImage
        storagePath={avatarPath}
        legacyUrl={avatarUrl}
        style={styles.avatarImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
});
