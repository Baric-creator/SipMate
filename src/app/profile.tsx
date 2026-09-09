import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  en: { loading: 'Loading profile...', notFound: 'Profile not found.', user: 'SipMate User', location: 'Location not set', privacyPolicy: 'PRIVACY POLICY', communityGuidelines: 'COMMUNITY GUIDELINES', deleteAccount: 'DELETE ACCOUNT', connectDiscord: 'CONNECT DISCORD', disconnectDiscord: 'DISCONNECT DISCORD', discordConnected: 'Discord connected', discordConnectError: 'Could not connect Discord right now.', discordDisconnectError: 'Could not disconnect Discord.', discordDisconnected: 'Discord disconnected.', profileCompletion: 'PROFILE COMPLETION', completeProfile: 'Complete your profile to get better nearby results.', complete: 'complete' },
  de: { loading: 'Profil wird geladen...', notFound: 'Profil nicht gefunden.', user: 'SipMate-Nutzer', location: 'Standort nicht festgelegt', privacyPolicy: 'DATENSCHUTZERKLÄRUNG', communityGuidelines: 'COMMUNITY-RICHTLINIEN', deleteAccount: 'KONTO LÖSCHEN', connectDiscord: 'DISCORD VERBINDEN', disconnectDiscord: 'DISCORD TRENNEN', discordConnected: 'Discord verbunden', discordConnectError: 'Discord konnte gerade nicht verbunden werden.', discordDisconnectError: 'Discord konnte nicht getrennt werden.', discordDisconnected: 'Discord getrennt.', profileCompletion: 'PROFILVOLLSTÄNDIGKEIT', completeProfile: 'Vervollständige dein Profil für bessere Nearby-Ergebnisse.', complete: 'vollständig' },
  hr: { loading: 'Učitavanje profila...', notFound: 'Profil nije pronađen.', user: 'SipMate korisnik', location: 'Lokacija nije postavljena', privacyPolicy: 'PRAVILA PRIVATNOSTI', communityGuidelines: 'PRAVILA ZAJEDNICE', deleteAccount: 'IZBRIŠI RAČUN', connectDiscord: 'POVEŽI DISCORD', disconnectDiscord: 'ODVOJI DISCORD', discordConnected: 'Discord povezan', discordConnectError: 'Discord se trenutno ne može povezati.', discordDisconnectError: 'Discord se ne može odvojiti.', discordDisconnected: 'Discord je odvojen.' },
} as const;

export default function UserProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadUserProfile();
    });
    return () => subscription.remove();
  }, []);

  async function loadUserProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setProfile(null);
        router.replace('/login');
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, age, city, bio, currently_up_for, is_active, avatar_url, is_premium, premium_until, discord_user_id, discord_username, discord_connected_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (error) { console.log('PROFILE LOAD ERROR:', error.message); setProfile(null); return; }

      if (!data) {
        const fallbackName =
          session.user.user_metadata?.name ??
          session.user.user_metadata?.full_name ??
          session.user.email?.split('@')[0] ??
          'SipMate User';

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            name: fallbackName,
            is_active: false,
            is_premium: false,
          }, { onConflict: 'id' })
          .select('id, name, age, city, bio, currently_up_for, is_active, avatar_url, is_premium, premium_until, discord_user_id, discord_username, discord_connected_at')
          .single();

        if (createError) {
          console.log('PROFILE CREATE ERROR:', createError.message);
          setProfile(null);
          return;
        }

        setProfile(created as UserProfile);
        return;
      }

      setProfile(data as UserProfile);
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

  const completionItems = [
    Boolean(profile.avatar_url),
    Boolean(profile.name?.trim()),
    Boolean(profile.age),
    Boolean(profile.city?.trim()),
    Boolean(profile.currently_up_for?.trim()),
    Boolean(profile.bio?.trim()),
  ];
  const completionPercent = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>SipMate 🍻</Text>
          <Pressable style={styles.topAction} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.topActionText}>✏️</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.avatarShell}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} resizeMode="cover" />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <Text style={styles.profileAvatarFallbackText}>{profile.name?.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={[styles.presenceDot, profile.is_active ? styles.presenceDotActive : styles.presenceDotInactive]} />
          </View>

          <Text style={styles.name}>{profile.name ?? text.user}{profile.age ? `, ${profile.age}` : ''}</Text>
          <Text style={styles.city}>📍 {profile.city ?? text.location}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.statusPill, profile.is_active ? styles.statusPillActive : styles.statusPillInactive]}>
              <Text style={[styles.statusPillText, profile.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
                {profile.is_active ? t('profileScreen.active') : t('profileScreen.inactive')}
              </Text>
            </View>
            {premiumActive && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>💎 PREMIUM</Text>
              </View>
            )}
          </View>
        </View>

        {completionPercent < 100 && (
          <Pressable style={styles.completionCard} onPress={() => router.push('/edit-profile')}>
            <View style={styles.completionTop}>
              <View>
                <Text style={styles.completionLabel}>{text.profileCompletion}</Text>
                <Text style={styles.completionCopy}>{text.completeProfile}</Text>
              </View>
              <Text style={styles.completionPercent}>{completionPercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
            </View>
          </Pressable>
        )}

        <View style={styles.quickGrid}>
          <Pressable style={styles.quickCard} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.quickIcon}>✏️</Text>
            <Text style={styles.quickLabel}>{t('profileScreen.editProfile')}</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => router.push('/language')}>
            <Text style={styles.quickIcon}>🌍</Text>
            <Text style={styles.quickLabel}>{t('profileScreen.language')}</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => router.push('/premium')}>
            <Text style={styles.quickIcon}>💎</Text>
            <Text style={styles.quickLabel}>{t('profileScreen.premium')}</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoEyebrow}>{t('profileScreen.currentlyUpFor')}</Text>
            <Text style={styles.infoIcon}>🍻</Text>
          </View>
          <Text style={styles.drink}>{profile.currently_up_for ?? t('profileScreen.readyForDrink')}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEyebrow}>{t('profileScreen.about')}</Text>
          <Text style={styles.bio}>{profile.bio?.trim() ? profile.bio : t('profileScreen.noBioYet')}</Text>
        </View>

        <View style={styles.discordCard}>
          <View style={styles.discordTop}>
            <View>
              <Text style={styles.discordTitle}>Discord</Text>
              <Text style={styles.discordStatus}>
                {profile.discord_user_id ? text.discordConnected : text.connectDiscord}
              </Text>
            </View>
            <Text style={styles.discordMark}>◉</Text>
          </View>
          {profile.discord_user_id && (
            <Text style={styles.discordUser}>@{profile.discord_username ?? profile.discord_user_id}</Text>
          )}
          <Pressable
            style={[styles.discordButton, profile.discord_user_id && styles.discordDisconnectButton]}
            onPress={profile.discord_user_id ? handleDisconnectDiscord : handleConnectDiscord}
          >
            <Text style={styles.discordButtonText}>
              {profile.discord_user_id ? text.disconnectDiscord : text.connectDiscord}
            </Text>
          </Pressable>
        </View>

        <View style={styles.settingsCard}>
          <Pressable style={styles.settingsRow} onPress={() => router.push('/blocked-users')}>
            <View style={styles.settingsRowLeft}><Text style={styles.settingsIcon}>🚫</Text><Text style={styles.settingsText}>{t('profileScreen.blockedUsers')}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.settingsRow} onPress={handleLogout}>
            <View style={styles.settingsRowLeft}><Text style={styles.settingsIcon}>🚪</Text><Text style={[styles.settingsText, styles.settingsDanger]}>{t('profileScreen.logout')}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={[styles.settingsRow, styles.settingsRowLast]} onPress={() => router.push('/delete-account')}>
            <View style={styles.settingsRowLeft}><Text style={styles.settingsIcon}>⚠️</Text><Text style={[styles.settingsText, styles.deleteText]}>{text.deleteAccount}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.legalLinks}>
          <Pressable style={styles.legalLink} onPress={() => router.push('/community-guidelines')}>
            <Text style={styles.legalLinkText}>🤝 {text.communityGuidelines}</Text>
          </Pressable>
          <Pressable style={styles.legalLink} onPress={() => router.push('/privacy')}>
            <Text style={styles.legalLinkText}>🔒 {text.privacyPolicy}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08090B' },
  scroll: { flex: 1 },
  scrollContent: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 44 },
  loading: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginTop: 40 },

  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  brand: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  topAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#141417', borderWidth: 1, borderColor: '#34343A', alignItems: 'center', justifyContent: 'center' },
  topActionText: { fontSize: 16 },

  hero: { alignItems: 'center', paddingTop: 6, paddingBottom: 22 },
  avatarShell: { position: 'relative', width: 128, height: 128, borderRadius: 64, padding: 4, backgroundColor: '#151518', borderWidth: 2, borderColor: '#4A2A2D', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 4 },
  profileAvatar: { width: '100%', height: '100%', borderRadius: 60, backgroundColor: '#27272A' },
  profileAvatarFallback: { flex: 1, borderRadius: 60, backgroundColor: '#450A0A', alignItems: 'center', justifyContent: 'center' },
  profileAvatarFallbackText: { color: '#FFFFFF', fontSize: 44, fontWeight: '900' },
  presenceDot: { position: 'absolute', right: 8, bottom: 8, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#09090B' },
  presenceDotActive: { backgroundColor: '#22C55E' },
  presenceDotInactive: { backgroundColor: '#52525B' },

  name: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 16, letterSpacing: -0.4 },
  city: { color: '#8B8B94', fontSize: 13, marginTop: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  statusPillActive: { backgroundColor: '#0A2815', borderColor: '#1F7A3D' },
  statusPillInactive: { backgroundColor: '#1C1C20', borderColor: '#3A3A40' },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  statusTextActive: { color: '#4ADE80' },
  statusTextInactive: { color: '#A1A1AA' },
  premiumBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#2B1C02', borderWidth: 1, borderColor: '#7A5208' },
  premiumBadgeText: { color: '#FBBF24', fontSize: 10, fontWeight: '900' },

  completionCard: { backgroundColor: '#121215', borderWidth: 1, borderColor: '#2F2F34', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 2 },
  completionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  completionLabel: { color: '#EF4444', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  completionCopy: { color: '#A1A1AA', fontSize: 11, lineHeight: 16, marginTop: 5, maxWidth: 320 },
  completionPercent: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  progressTrack: { height: 6, backgroundColor: '#25252A', borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', backgroundColor: '#EF4444', borderRadius: 999 },

  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickCard: { flex: 1, minHeight: 90, backgroundColor: '#121215', borderWidth: 1, borderColor: '#2F2F34', borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  quickIcon: { fontSize: 22, marginBottom: 7 },
  quickLabel: { color: '#E4E4E7', fontSize: 10, fontWeight: '800', textAlign: 'center', fontFamily: 'sans-serif' },

  infoCard: { backgroundColor: '#121215', borderWidth: 1, borderColor: '#2F2F34', borderRadius: 22, padding: 18, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 2 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoEyebrow: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  infoIcon: { fontSize: 18 },
  drink: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 10, fontFamily: 'sans-serif' },
  bio: { color: '#D4D4D8', fontSize: 14, lineHeight: 21, marginTop: 9 },

  discordCard: { backgroundColor: '#11131A', borderWidth: 1, borderColor: '#303657', borderRadius: 20, padding: 18, marginBottom: 12 },
  discordTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  discordTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  discordStatus: { color: '#9CA3C7', fontSize: 11, marginTop: 3 },
  discordMark: { color: '#5865F2', fontSize: 24 },
  discordUser: { color: '#C7C9D9', fontSize: 12, marginTop: 9 },
  discordButton: { marginTop: 14, minHeight: 44, borderRadius: 14, backgroundColor: '#5865F2', alignItems: 'center', justifyContent: 'center' },
  discordDisconnectButton: { backgroundColor: '#202128', borderWidth: 1, borderColor: '#3B3D4A' },
  discordButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', fontFamily: 'sans-serif' },

  settingsCard: { backgroundColor: '#121215', borderWidth: 1, borderColor: '#2F2F34', borderRadius: 22, overflow: 'hidden' },
  settingsRow: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#25252A' },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
  settingsIcon: { fontSize: 17 },
  settingsText: { color: '#E4E4E7', fontSize: 13, fontWeight: '800', fontFamily: 'sans-serif' },
  settingsDanger: { color: '#F87171' },
  deleteText: { color: '#FCA5A5' },
  chevron: { color: '#52525B', fontSize: 26, fontWeight: '300' },

  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  legalLink: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#101012', borderWidth: 1, borderColor: '#222226' },
  legalLinkText: { color: '#66666E', fontSize: 9, fontWeight: '700', fontFamily: 'sans-serif' },
});
