import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Image, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { showAlert } from '../lib/notify';
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
  discord_user_id: string | null;
  discord_username: string | null;
  discord_connected_at: string | null;
};

const copy = {
  en: { loading: 'Loading profile...', notFound: 'Profile not found.', user: 'SipMate User', location: 'Location not set', privacyPolicy: 'PRIVACY POLICY', communityGuidelines: 'COMMUNITY GUIDELINES', deleteAccount: 'DELETE ACCOUNT', connectDiscord: 'CONNECT DISCORD', disconnectDiscord: 'DISCONNECT DISCORD', discordConnected: 'Discord connected', discordConnectError: 'Could not connect Discord right now.', discordDisconnectError: 'Could not disconnect Discord.', discordDisconnected: 'Discord disconnected.' },
  de: { loading: 'Profil wird geladen...', notFound: 'Profil nicht gefunden.', user: 'SipMate-Nutzer', location: 'Standort nicht festgelegt', privacyPolicy: 'DATENSCHUTZERKLÄRUNG', communityGuidelines: 'COMMUNITY-RICHTLINIEN', deleteAccount: 'KONTO LÖSCHEN', connectDiscord: 'DISCORD VERBINDEN', disconnectDiscord: 'DISCORD TRENNEN', discordConnected: 'Discord verbunden', discordConnectError: 'Discord konnte gerade nicht verbunden werden.', discordDisconnectError: 'Discord konnte nicht getrennt werden.', discordDisconnected: 'Discord getrennt.' },
  hr: { loading: 'Učitavanje profila...', notFound: 'Profil nije pronađen.', user: 'SipMate korisnik', location: 'Lokacija nije postavljena', privacyPolicy: 'PRAVILA PRIVATNOSTI', communityGuidelines: 'PRAVILA ZAJEDNICE', deleteAccount: 'IZBRIŠI RAČUN', connectDiscord: 'POVEŽI DISCORD', disconnectDiscord: 'ODVOJI DISCORD', discordConnected: 'Discord povezan', discordConnectError: 'Discord se trenutno ne može povezati.', discordDisconnectError: 'Discord se ne može odvojiti.', discordDisconnected: 'Discord je odvojen.' },
} as const;

export default function UserProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  useEffect(() => {
    loadUserProfile();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadUserProfile();
    });
    return () => subscription.remove();
  }, []);

  async function loadUserProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setProfile(null); return; }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, age, city, bio, currently_up_for, is_active, avatar_url, is_premium, premium_until, discord_user_id, discord_username, discord_connected_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (error) { console.log('PROFILE LOAD ERROR:', error.message); setProfile(null); return; }
      setProfile(data as UserProfile | null);
    } finally { setLoading(false); }
  }

  async function handleConnectDiscord() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { showAlert(text.discordConnectError); return; }

      const { data, error } = await supabase.functions.invoke('discord-oauth', {
        body: { action: 'start' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.url) {
        console.log('DISCORD CONNECT ERROR:', error ?? data);
        showAlert(text.discordConnectError);
        return;
      }

      await Linking.openURL(data.url);
    } catch (error) {
      console.log('DISCORD CONNECT ERROR:', error);
      showAlert(text.discordConnectError);
    }
  }

  async function handleDisconnectDiscord() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { showAlert(text.discordDisconnectError); return; }

      const { data, error } = await supabase.functions.invoke('discord-oauth', {
        body: { action: 'disconnect' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || data?.ok !== true) {
        console.log('DISCORD DISCONNECT ERROR:', error ?? data);
        showAlert(text.discordDisconnectError);
        return;
      }

      await loadUserProfile();
      showAlert(text.discordDisconnected);
    } catch (error) {
      console.log('DISCORD DISCONNECT ERROR:', error);
      showAlert(text.discordDisconnectError);
    }
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
          <View style={styles.discordCard}>
            <View style={styles.discordHeader}><Text style={styles.discordLogo}>Discord</Text><Text style={styles.discordStatus}>{profile.discord_user_id ? '●' : '○'} {profile.discord_user_id ? text.discordConnected : text.connectDiscord}</Text></View>
            {profile.discord_user_id && <Text style={styles.discordUser}>@{profile.discord_username ?? profile.discord_user_id}</Text>}
            <Pressable style={[styles.discordButton, profile.discord_user_id && styles.discordDisconnectButton]} onPress={profile.discord_user_id ? handleDisconnectDiscord : handleConnectDiscord}>
              <Text style={styles.discordButtonText}>{profile.discord_user_id ? `🔌 ${text.disconnectDiscord}` : `🎮 ${text.connectDiscord}`}</Text>
            </Pressable>
          </View>
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
  premiumButton: { width: '100%', marginTop: 24, backgroundColor: '#F59E0B', borderWidth: 1, borderColor: '#FBBF24', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, premiumButtonText: { color: '#09090B', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }, discordCard: { width: '100%', marginTop: 14, backgroundColor: '#16141F', borderWidth: 1, borderColor: '#5865F2', borderRadius: 18, padding: 16 }, discordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, discordLogo: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, discordStatus: { color: '#A5B4FC', fontSize: 11, fontWeight: '800' }, discordUser: { color: '#D4D4D8', fontSize: 13, marginTop: 8 }, discordButton: { marginTop: 14, backgroundColor: '#5865F2', paddingVertical: 13, borderRadius: 14, alignItems: 'center' }, discordDisconnectButton: { backgroundColor: '#27272A', borderWidth: 1, borderColor: '#5865F2' }, discordButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 }, editButton: { width: '100%', marginTop: 14, backgroundColor: '#DC2626', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, editButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, secondaryButton: { width: '100%', marginTop: 14, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#DC2626', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }, languageButton: { width: '100%', marginTop: 14, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }, languageButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.6 }, infoButton: { width: '100%', marginTop: 14, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }, infoButtonText: { color: '#D4D4D8', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }, logoutButton: { width: '100%', marginTop: 24, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#DC2626', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, dangerText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }, deleteButton: { width: '100%', marginTop: 14, backgroundColor: '#450A0A', borderWidth: 1, borderColor: '#EF4444', paddingVertical: 16, borderRadius: 22, alignItems: 'center' }, deleteText: { color: '#FCA5A5', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});