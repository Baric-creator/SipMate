import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { NearbyProfile } from '../lib/privacy-profile-api';
import { NearbyProfileAvatar } from './nearby-profile-avatar';

type NearbyProfileCardProps = {
  person: NearbyProfile & { distance: number };
  activityLabel: string;
  onSkip: (userId: string) => void;
};

export function NearbyProfileCard({ person, activityLabel, onSkip }: NearbyProfileCardProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/user-profile', params: { id: person.id } })}
    >
      <View style={styles.profileInfo}>
        <NearbyProfileAvatar
          name={person.name}
          avatarPath={person.avatar_path}
          avatarUrl={person.avatar_url}
        />

        <View style={styles.nameArea}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {person.name ?? t('nearbyScreen.userFallback')}
              {person.age ? `, ${person.age}` : ''}
            </Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>● {t('nearbyScreen.active')}</Text>
            </View>
          </View>
          <Text style={styles.distance}>
            📍 {person.distance < 1
              ? `${Math.round(person.distance * 1000)} ${t('nearbyScreen.metersAway')}`
              : `${person.distance.toFixed(1)} ${t('nearbyScreen.kilometersAway')}`}
          </Text>
        </View>
      </View>

      <View style={styles.activityBox}>
        <Text style={styles.activityLabel}>{t('nearbyScreen.currentlyUpFor')}</Text>
        <Text style={styles.activity}>{activityLabel}</Text>
      </View>

      <Text style={styles.openProfile}>{t('nearbyScreen.viewProfile')}</Text>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={(event) => {
          event.stopPropagation();
          onSkip(person.id);
        }}
      >
        <Text style={styles.skipButtonText}>✕ {t('nearbyScreen.skip')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#18181B', borderRadius: 22, padding: 18, marginBottom: 14 },
  profileInfo: { flexDirection: 'row', alignItems: 'center' },
  nameArea: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginRight: 8 },
  activeBadge: { backgroundColor: '#14532D', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { color: '#86EFAC', fontSize: 11, fontWeight: '700' },
  distance: { color: '#A1A1AA', marginTop: 5 },
  activityBox: { marginTop: 16, backgroundColor: '#27272A', borderRadius: 14, padding: 12 },
  activityLabel: { color: '#A1A1AA', fontSize: 12 },
  activity: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 3 },
  openProfile: { color: '#A78BFA', fontWeight: '700', marginTop: 14 },
  skipButton: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 6, paddingHorizontal: 8 },
  skipButtonText: { color: '#A1A1AA', fontWeight: '700' },
});
