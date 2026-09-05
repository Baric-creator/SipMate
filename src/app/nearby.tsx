import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// PrivateProfileImage is intentionally encapsulated by NearbyProfileAvatar so
// this screen cannot construct, cache-bust, or retain signed Storage URLs itself.
import { NearbyProfileAvatar } from '../components/nearby-profile-avatar';
import { filterNearbyProfiles, NearbyDisplayProfile } from '../lib/nearby-profile-filters';
import { isPremiumProfileActive } from '../lib/nearby-premium';
import {
  getNearbyProfiles,
  getSkippedProfileSummaries,
  SkippedProfileSummary,
} from '../lib/privacy-profile-api';
import { supabase } from '../lib/supabase';

export default function NearbyScreen() {
  const { t } = useTranslation();
  const [nearbyProfiles, setNearbyProfiles] = useState<NearbyDisplayProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDistance, setMaxDistance] = useState(10);
  const [drinkFilter, setDrinkFilter] = useState('All');
  const [isPremium, setIsPremium] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [ageFilter, setAgeFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [showLocationChanger, setShowLocationChanger] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customLatitude, setCustomLatitude] = useState<number | null>(null);
  const [customLongitude, setCustomLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showSkippedProfiles, setShowSkippedProfiles] = useState(false);
  const [skippedProfiles, setSkippedProfiles] = useState<SkippedProfileSummary[]>([]);
  const [loadingSkipped, setLoadingSkipped] = useState(false);

  const drinkFilters = [
    { value: 'All', label: t('nearbyScreen.all') },
    { value: '🍺 Beer', label: `🍺 ${t('nearbyScreen.beer')}` },
    { value: '🍹 Cocktail', label: `🍹 ${t('nearbyScreen.cocktail')}` },
    { value: '☕ Coffee', label: `☕ ${t('nearbyScreen.coffee')}` },
    { value: '🥂 Drinks', label: `🥂 ${t('nearbyScreen.drinks')}` },
    { value: '🎉 Hangout', label: `🎉 ${t('nearbyScreen.hangout')}` },
  ];

  function translateActivity(activity: string | null) {
    if (!activity) return t('nearbyScreen.readyForDrink');
    const translations: Record<string, string> = {
      '🍺 Beer': `🍺 ${t('nearbyScreen.beer')}`,
      '🍹 Cocktail': `🍹 ${t('nearbyScreen.cocktail')}`,
      '🍸 Cocktail': `🍸 ${t('nearbyScreen.cocktail')}`,
      '☕ Coffee': `☕ ${t('nearbyScreen.coffee')}`,
      '🥂 Drinks': `🥂 ${t('nearbyScreen.drinks')}`,
      '🎉 Hangout': `🎉 ${t('nearbyScreen.hangout')}`,
    };
    return translations[activity] ?? activity;
  }

  async function loadNearbyProfiles() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: myProfile, error: myError } = await supabase
        .from('profiles')
        .select('is_premium, premium_until')
        .eq('id', user.id)
        .single();
      if (myError) throw myError;

      const premiumActive = isPremiumProfileActive(myProfile);
      setIsPremium(premiumActive);

      const profiles = await getNearbyProfiles({
        maxDistanceKm: maxDistance,
        customOriginLatitude: premiumActive ? customLatitude : null,
        customOriginLongitude: premiumActive ? customLongitude : null,
      });

      setNearbyProfiles(filterNearbyProfiles(profiles, {
        drinkFilter,
        premiumActive,
        ageFilter,
        genderFilter,
      }));
    } catch (error) {
      console.log('NEARBY CRASH:', error);
      setNearbyProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNearbyProfiles();
  }, [maxDistance, drinkFilter, ageFilter, genderFilter, customLatitude, customLongitude]);

  async function handleSkipProfile(skippedUserId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      const { error } = await supabase.from('skipped_profiles').upsert(
        { user_id: user.id, skipped_user_id: skippedUserId },
        { onConflict: 'user_id,skipped_user_id' }
      );
      if (error) throw error;
      setNearbyProfiles((current) => current.filter((person) => person.id !== skippedUserId));
    } catch (error) {
      console.log('SKIP PROFILE ERROR:', error);
    }
  }

  async function loadSkippedProfiles() {
    try {
      setLoadingSkipped(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      setSkippedProfiles(await getSkippedProfileSummaries());
    } catch (error) {
      console.log('LOAD SKIPPED ERROR:', error);
      setSkippedProfiles([]);
    } finally {
      setLoadingSkipped(false);
    }
  }

  async function handleRestoreProfile(skippedUserId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      const { error } = await supabase
        .from('skipped_profiles')
        .delete()
        .eq('user_id', user.id)
        .eq('skipped_user_id', skippedUserId);
      if (error) throw error;
      setSkippedProfiles((current) => current.filter((person) => person.id !== skippedUserId));
      await loadNearbyProfiles();
    } catch (error) {
      console.log('RESTORE PROFILE ERROR:', error);
    }
  }

  async function applyCustomLocation() {
    if (!customCity.trim()) return;
    try {
      setLocationLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(customCity.trim())}`
      );
      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        alert(t('nearbyScreen.locationNotFound'));
        return;
      }
      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid geocoding result');
      setCustomLatitude(latitude);
      setCustomLongitude(longitude);
    } catch (error) {
      console.log('GEOCODING ERROR:', error);
      alert(t('nearbyScreen.locationError'));
    } finally {
      setLocationLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🍻 SipMate</Text>
      <Text style={styles.subtitle}>{t('nearbyScreen.subtitle')}</Text>

      <View style={styles.filterRow}>
        {[1, 5, 10, 25].map((distance) => (
          <FilterChip key={distance} active={maxDistance === distance} label={`${distance} km`} onPress={() => setMaxDistance(distance)} />
        ))}
      </View>

      <View style={styles.filterRow}>
        {drinkFilters.map((item) => (
          <FilterChip key={item.value} active={drinkFilter === item.value} label={item.label} onPress={() => setDrinkFilter(item.value)} />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.advancedButton, isPremium && styles.premiumBorder]}
        onPress={() => isPremium ? setShowAdvancedFilters((value) => !value) : router.push('/premium')}
      >
        <View>
          <Text style={styles.premiumTitle}>💎 {t('nearbyScreen.advancedFilters')}</Text>
          <Text style={styles.muted}>{isPremium ? t('nearbyScreen.advancedPremium') : t('nearbyScreen.advancedLocked')}</Text>
        </View>
        <Text style={styles.premiumTitle}>{isPremium ? '›' : '🔒'}</Text>
      </TouchableOpacity>

      {isPremium && showAdvancedFilters && (
        <View style={[styles.panel, styles.premiumBorder]}>
          <Text style={styles.premiumTitle}>💎 {t('nearbyScreen.premiumFilters')}</Text>
          <Text style={styles.label}>{t('nearbyScreen.age')}</Text>
          <View style={styles.filterRow}>
            {['All', '18-25', '26-35', '36-45', '46+'].map((item) => (
              <FilterChip key={item} active={ageFilter === item} label={item === 'All' ? t('nearbyScreen.all') : item} onPress={() => setAgeFilter(item)} premium />
            ))}
          </View>
          <Text style={styles.label}>{t('nearbyScreen.gender')}</Text>
          <View style={styles.filterRow}>
            {[
              ['All', t('nearbyScreen.all')],
              ['male', `👨 ${t('nearbyScreen.men')}`],
              ['female', `👩 ${t('nearbyScreen.women')}`],
              ['other', `⚪ ${t('nearbyScreen.other')}`],
            ].map(([value, label]) => (
              <FilterChip key={value} active={genderFilter === value} label={label} onPress={() => setGenderFilter(value)} premium />
            ))}
          </View>

          <TouchableOpacity style={styles.panelButton} onPress={() => setShowLocationChanger((value) => !value)}>
            <View><Text style={styles.premiumTitle}>📍 {t('nearbyScreen.changeLocation')}</Text><Text style={styles.muted}>{t('nearbyScreen.changeLocationSubtitle')}</Text></View>
            <Text style={styles.premiumTitle}>{showLocationChanger ? '⌃' : '›'}</Text>
          </TouchableOpacity>

          {showLocationChanger && (
            <View style={styles.innerPanel}>
              <Text style={styles.label}>{t('nearbyScreen.city')}</Text>
              <TextInput style={styles.input} value={customCity} onChangeText={setCustomCity} placeholder={t('nearbyScreen.cityPlaceholder')} placeholderTextColor="#52525B" />
              <TouchableOpacity style={styles.applyButton} onPress={() => void applyCustomLocation()} disabled={locationLoading}>
                <Text style={styles.applyText}>{locationLoading ? t('nearbyScreen.findingLocation') : t('nearbyScreen.useThisLocation')}</Text>
              </TouchableOpacity>
              {customLatitude !== null && customLongitude !== null && (
                <>
                  <Text style={styles.success}>✓ {t('nearbyScreen.locationFound')} {customCity}</Text>
                  <Text style={styles.premiumTitle}>📍 {t('nearbyScreen.searchingAround')} {customCity}</Text>
                  <TouchableOpacity style={styles.resetButton} onPress={() => { setCustomCity(''); setCustomLatitude(null); setCustomLongitude(null); setShowLocationChanger(false); }}>
                    <Text style={styles.whiteText}>{t('nearbyScreen.useMyLocationAgain')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.panelButton} onPress={() => { if (!showSkippedProfiles) void loadSkippedProfiles(); setShowSkippedProfiles((value) => !value); }}>
            <View><Text style={styles.premiumTitle}>↩️ {t('nearbyScreen.skippedProfiles')}</Text><Text style={styles.muted}>{t('nearbyScreen.skippedProfilesSubtitle')}</Text></View>
            <Text style={styles.premiumTitle}>{showSkippedProfiles ? '⌃' : '›'}</Text>
          </TouchableOpacity>

          {showSkippedProfiles && (
            <View style={styles.innerPanel}>
              {loadingSkipped ? <Text style={styles.muted}>{t('nearbyScreen.loadingSkipped')}</Text> : skippedProfiles.length === 0 ? <Text style={styles.muted}>{t('nearbyScreen.noSkippedProfiles')}</Text> : skippedProfiles.map((person) => (
                <View key={person.id} style={styles.skippedRow}>
                  <View style={styles.flex}><Text style={styles.whiteText}>{person.name ?? t('nearbyScreen.userFallback')}{person.age ? `, ${person.age}` : ''}</Text><Text style={styles.muted}>{translateActivity(person.currently_up_for)}</Text></View>
                  <TouchableOpacity onPress={() => void handleRestoreProfile(person.id)}><Text style={styles.premiumTitle}>↩️ {t('nearbyScreen.restore')}</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.resetButton} onPress={() => { setAgeFilter('All'); setGenderFilter('All'); }}>
            <Text style={styles.whiteText}>{t('nearbyScreen.resetFilters')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? <Text style={styles.subtitle}>📍 {t('nearbyScreen.findingPeople')}</Text> : nearbyProfiles.length === 0 ? <Text style={styles.subtitle}>🍻 {t('nearbyScreen.nobodyNearby')}</Text> : nearbyProfiles.map((person) => (
        <TouchableOpacity key={person.id} style={styles.card} activeOpacity={0.8} onPress={() => router.push({ pathname: '/user-profile', params: { id: person.id } })}>
          <View style={styles.profileRow}>
            <NearbyProfileAvatar name={person.name} avatarPath={person.avatar_path} avatarUrl={person.avatar_url} />
            <View style={styles.flex}>
              <View style={styles.nameRow}><Text style={styles.name}>{person.name ?? t('nearbyScreen.userFallback')}{person.age ? `, ${person.age}` : ''}</Text><View style={styles.activeBadge}><Text style={styles.activeText}>● {t('nearbyScreen.active')}</Text></View></View>
              <Text style={styles.muted}>📍 {person.distance < 1 ? `${Math.round(person.distance * 1000)} ${t('nearbyScreen.metersAway')}` : `${person.distance.toFixed(1)} ${t('nearbyScreen.kilometersAway')}`}</Text>
            </View>
          </View>
          <View style={styles.activityBox}><Text style={styles.label}>{t('nearbyScreen.currentlyUpFor')}</Text><Text style={styles.activity}>{translateActivity(person.currently_up_for)}</Text></View>
          <Text style={styles.openProfile}>{t('nearbyScreen.viewProfile')}</Text>
          <TouchableOpacity style={styles.skipButton} onPress={(event) => { event.stopPropagation(); void handleSkipProfile(person.id); }}><Text style={styles.muted}>✕ {t('nearbyScreen.skip')}</Text></TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

type FilterChipProps = { active: boolean; label: string; onPress: () => void; premium?: boolean };
function FilterChip({ active, label, onPress, premium = false }: FilterChipProps) {
  return <TouchableOpacity style={[styles.chip, active && (premium ? styles.chipPremium : styles.chipActive)]} onPress={onPress}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B', paddingTop: 60 },
  scrollContent: { paddingBottom: 40 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 10 },
  subtitle: { color: '#A1A1AA', fontSize: 15, marginTop: 8, marginBottom: 28 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  chip: { backgroundColor: '#27272A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#3F3F46' },
  chipActive: { backgroundColor: '#DC2626', borderColor: '#EF4444' },
  chipPremium: { backgroundColor: '#F59E0B', borderColor: '#FBBF24' },
  chipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '900' },
  advancedButton: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 20, padding: 16, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumBorder: { borderColor: '#FBBF24' },
  premiumTitle: { color: '#FBBF24', fontSize: 12, fontWeight: '900' },
  muted: { color: '#A1A1AA', fontSize: 11, marginTop: 3 },
  panel: { backgroundColor: '#18181B', borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 24 },
  label: { color: '#71717A', fontSize: 10, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  panelButton: { backgroundColor: '#27272A', borderRadius: 16, padding: 14, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  innerPanel: { backgroundColor: '#09090B', borderRadius: 14, padding: 14, marginTop: 8 },
  input: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 14, color: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12 },
  applyButton: { backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 12, marginTop: 10, alignItems: 'center' },
  applyText: { color: '#09090B', fontSize: 11, fontWeight: '900' },
  success: { color: '#22C55E', fontSize: 11, fontWeight: '800', marginTop: 10 },
  resetButton: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: '#27272A', alignSelf: 'flex-start' },
  whiteText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  skippedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  flex: { flex: 1 },
  card: { backgroundColor: '#18181B', padding: 18, borderRadius: 24, marginBottom: 14, borderWidth: 1, borderColor: '#27272A' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginLeft: 12 },
  activeBadge: { marginLeft: 10, backgroundColor: '#052E16', borderWidth: 1, borderColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  activeText: { color: '#4ADE80', fontSize: 9, fontWeight: '900' },
  activityBox: { marginTop: 14, backgroundColor: '#202023', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: '#2F2F35' },
  activity: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 5 },
  openProfile: { color: '#EF4444', fontSize: 12, fontWeight: '900', marginTop: 12 },
  skipButton: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#27272A' },
});
