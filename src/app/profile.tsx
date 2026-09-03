import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';

type UserProfile = {
  avatar_url: string | null;
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  currently_up_for: string | null;
  is_active: boolean | null;
  is_premium: boolean;
  premium_until: string | null;
};

const copy = {
  en: { loading: 'Loading profile...', notFound: 'Profile not found.', user: 'SipMate User', location: 'Location not set', privacyPolicy: 'PRIVACY POLICY', communityGuidelines: 'COMMUNITY GUIDELINES', deleteAccount: 'DELETE ACCOUNT' },
  de: { loading: 'Profil wird geladen...', notFound: 'Profil nicht gefunden.', user: 'SipMate-Nutzer', location: 'Standort nicht festgelegt', privacyPolicy: 'DATENSCHUTZERKLÄRUNG', communityGuidelines: 'COMMUNITY-RICHTLINIEN', deleteAccount: 'KONTO LÖSCHEN' },
  hr: { loading: 'Učitavanje profila...', notFound: 'Profil nije pronađen.', user: 'SipMate korisnik', location: 'Lokacija nije postavljena', privacyPolicy: 'PRAVILA PRIVATNOSTI', communityGuidelines: 'PRAVILA ZAJEDNICE', deleteAccount: 'IZBRIŠI RAČUN' },
} as const;

export default function UserProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  useEffect(() => { loadUserProfile(); }, []);

  async function loadUserProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setProfile(null); return; }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, age, city, bio, currently_up_for, is_active, avatar_url, is_premium, premium_until')
        .eq('id', session.user.id)
        .maybeSingle();
      if (error) { console.log('PROFILE LOAD ERROR:', error.message); setProfile(null); return; }
      setProfile(data as UserProfile | null);
    } finally { setLoading(false); }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) { console.log('LOGOUT ERROR:', error.message); return; }
    router.replace('/login');
  }

  if (loading) return <SafeAreaView style={styles.screen}><Text style={styles.loading}>{text.loading}</Text></SafeAreaView>;
  if (!profile) return <SafeAreaView style={styles.screen}><Text style={styles.loading}>{text.notFound}</Text></SafeAreaView>;

  const premiumActive = profile.is_premium === true &&
    (!profile.premium_until || new Date(profile.premium_until) > new Date());

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} resizeMode="cover" /> : <View style={styles.profileAvatarFallback}><Text style={styles.profileAvatarFallbackText}>{profile.name?.charAt(0).toUpperCase() || '?'}</Text></View>}
          <Text style={styles.name}>{profile.name ?? text.user}{profile.age ? `, ${profile.age}` : ''}</Text>
          {premiumActive && <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>💎 PREMIUM</Text></View>}
          <Text style={styles.city}>📍 {profile.city ?? text.location}</Text>
          <View style={[styles.statusBadge, profile.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive]}><Text style={[styles.statusBadgeText, profile.is_active ? styles.statusTextActive : styles.statusTextInactive]}>{profile.is_active ? `● ${t('profileScreen.active')}` : `● ${t('profileScreen.inactive')}`}</Text></View>
          <View style={styles.section}><Text style={styles.label}>{t('profileScreen.currentlyUpFor')}</Text><View style={styles.drinkChip}><Text style={styles.drink}>{profile.currently_up_for ?? t('profileScreen.readyForDrink')}</Text></View></View>
          <View style={styles.section}><Text style={styles.label}>{t('profileScreen.about')}</Text><Text style={styles.bio}>{profile.bio?.trim() ? profile.bio : t('profileScreen.noBioYet')}</Text></View>
          <Pressable style={styles.premiumButton} onPress={() => router.push('/premium')}><Text style={styles.premiumButtonText}>💎 {t('profileScreen.premium')}</Text></Pressable>
          <Pressable style={styles.editButton} onPress={() => router.push('/edit-profile')}><Text style={styles.editButtonText}>✏️ {t('profileScreen.editProfile')}</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/blocked-users')}><Text style={styles.dangerText}>🚫 {t('profileScreen.blockedUsers')}</Text></Pressable>
          <Pressable style={styles.languageButton} onPress={() => router.push('/language')}><Text style={styles.languageButtonText}>🌍 {t('profileScreen.language')}</Text></Pressable>
          <Pressable style={styles.infoButton} onPress={() => router.push('/community-guidelines')}><Text style={styles.infoButtonText}>🤝 {text.communityGuidelines}</Text></Pressable>
          <Pressable style={styles.infoButton} onPress={() => router.push('/privacy')}><Text style={styles.infoButtonText}>🔒 {text.privacyPolicy}</Text></Pressable>
          <Pressable style={styles.logoutButton} onPress={handleLogout}><Text style={styles.dangerText}>🚪 {t('profileScreen.logout')}</Text></Pressable>
          <Pressable style={styles.deleteButton} onPress={() => router.push('/delete-account')}><Text style={styles.deleteText}>⚠️ {text.deleteAccount}</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' }, scroll: { flex: 1 }, scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }, loading: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginTop: 40 }, card: { width: '100%', maxWidth: 520, backgroundColor: '#18181B', borderRadius: 28, padding: 28, alignItems: 'center' },
  profileAvatar: { width: 140, height: 140, borderRadius: 70, marginBottom: 18, backgroundColor: '#27272A', borderWidth: 3, borderColor: '#DC2626' }, profileAvatarFallback: { width: 140, height: 140, borderRadius: 70, marginBottom: 18, backgroundColor: '#450A0A', borderWidth: 3, borderColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }, profileAvatarFallbackText: { color: '#FFFFFF', fontSize: 48, fontWeight: '900' }, name: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 18 }, city: { color: '#A1A1AA', marginTop: 6 }, premiumBadge: { marginTop: 10, backgroundColor: '#F59E0B', borderWidth: 1, borderColor: '#FBBF24', paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999 }, premiumBadgeText: { color: '#09090B', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  statusBadge: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 }, statusBadgeActive: { backgroundColor: '#052E16', borderColor: '#22C55E' }, statusBadgeInactive: { backgroundColor: '#27272A', borderColor: '#52525B' }, statusBadgeText: { fontSize: 11, fontWeight: '900' }, statusTextActive: { color: '#4ADE80' }, statusTextInactive: { color: '#A1A1AA' }, section: { width: '100%', backgroundColor: '#27272A', padding: 16, borderRadius: 18, marginTop: 18 }, label: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 }, drinkChip: { marginTop: 10, backgroundColor: '#09090B', borderWidth: 1, borderColor: '#DC2626', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }, drink: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' }, bio: { color: '#D4D4D8', fontSize: 14, lineHeight: 21, marginTop: 7 },
  premiumButton: { width: '100%', marginTop: 24, backgroundColor: '#F59E0B', borderWidth: 1, borderColor: '#FBBF24', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, premiumButtonText: { color: '#09090B', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }, editButton: { width: '100%', marginTop: 14, backgroundColor: '#DC2626', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, editButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, secondaryButton: { width: '100%', marginTop: 14, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#DC2626', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }, languageButton: { width: '100%', marginTop: 14, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }, languageButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.6 }, infoButton: { width: '100%', marginTop: 14, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }, infoButtonText: { color: '#D4D4D8', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }, logoutButton: { width: '100%', marginTop: 24, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#DC2626', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, dangerText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }, deleteButton: { width: '100%', marginTop: 14, backgroundColor: '#450A0A', borderWidth: 1, borderColor: '#EF4444', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, deleteText: { color: '#FCA5A5', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});