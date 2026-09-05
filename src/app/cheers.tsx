import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getCheersOverview } from '../lib/privacy-profile-api';
import { supabase } from '../lib/supabase';

type CheersItem = {
  id: string;
  userId: string | null;
  name: string;
  age: number | null;
  status: 'Mutual Cheers' | 'Sent' | 'Received';
  identityRevealed: boolean;
};

export default function CheersScreen() {
  const { t } = useTranslation();
  const [cheers, setCheers] = useState<CheersItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheers();
  }, []);

  async function loadCheers() {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCheers([]);
        return;
      }

      const overview = await getCheersOverview();
      setCheers(
        overview.map((item) => ({
          id: item.cheers_id,
          userId: item.user_id,
          name: item.name ?? t('cheersScreen.userFallback'),
          age: item.age,
          status: item.status,
          identityRevealed: item.identity_revealed,
        }))
      );
    } catch (error) {
      console.log('CHEERS LOAD ERROR:', error instanceof Error ? error.message : error);
      setCheers([]);
    } finally {
      setLoading(false);
    }
  }

  async function openChat(item: CheersItem) {
    if (!item.userId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }

    const myId = session.user.id;
    const otherId = item.userId;
    const userOne = myId < otherId ? myId : otherId;
    const userTwo = myId < otherId ? otherId : myId;

    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_one', userOne)
      .eq('user_two', userTwo)
      .maybeSingle();
    if (findError) {
      console.log('CHEERS CONVERSATION FIND ERROR:', findError.message);
      return;
    }

    let conversationId = existingConversation?.id;
    if (!conversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({ user_one: userOne, user_two: userTwo })
        .select('id')
        .single();
      if (createError) {
        console.log('CHEERS CONVERSATION CREATE ERROR:', createError.message);
        return;
      }
      conversationId = newConversation.id;
    }

    router.push({ pathname: '/chat', params: { conversationId, id: item.userId, name: item.name } });
  }

  const mutualCheers = cheers.filter((item) => item.status === 'Mutual Cheers');
  const receivedCheers = cheers.filter((item) => item.status === 'Received');
  const sentCheers = cheers.filter((item) => item.status === 'Sent');

  function renderCheersCard(item: CheersItem) {
    const isMutual = item.status === 'Mutual Cheers';
    const isReceived = item.status === 'Received';
    const isLockedReceived = isReceived && !item.identityRevealed;

    function openProfile() {
      if (isLockedReceived || !item.userId) {
        router.push('/premium');
        return;
      }
      router.push({ pathname: '/user-profile', params: { id: item.userId } });
    }

    function getDetail() {
      if (isLockedReceived) return t('cheersScreen.premiumReveal');
      if (isMutual) return t('cheersScreen.bothSent');
      if (item.status === 'Sent') {
        return `${t('cheersScreen.waitingFor')} ${item.name || t('cheersScreen.thisUser')} ${t('cheersScreen.toSendBack')}`;
      }
      return `${item.name || t('cheersScreen.someone')} ${t('cheersScreen.sentYou')}`;
    }

    return (
      <View key={item.id} style={[styles.card, isMutual && styles.cardMutual, isLockedReceived && styles.cardLocked]}>
        <TouchableOpacity style={[styles.avatar, isMutual && styles.avatarMutual, isLockedReceived && styles.avatarLocked]} onPress={openProfile}>
          <Text style={styles.avatarText}>{isLockedReceived ? '🔒' : item.name.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
        <View style={styles.content}>
          <TouchableOpacity onPress={openProfile}>
            <Text style={styles.name}>{isLockedReceived ? t('cheersScreen.lockedName') : `${item.name}${item.age ? `, ${item.age}` : ''}`}</Text>
          </TouchableOpacity>
          <Text style={[styles.status, isMutual && styles.statusMutual, isReceived && styles.statusReceived]}>
            {isMutual ? `🍻 ${t('cheersScreen.mutual')}` : isReceived ? `🍻 ${t('cheersScreen.received')}` : `🍻 ${t('cheersScreen.sent')}`}
          </Text>
          <Text style={styles.detail}>{getDetail()}</Text>
        </View>
        {isMutual && item.userId && (
          <TouchableOpacity style={styles.chatButton} onPress={() => openChat(item)}>
            <Text style={styles.chatButtonText}>💬 {t('cheersScreen.openChat')}</Text>
          </TouchableOpacity>
        )}
        {isLockedReceived && (
          <TouchableOpacity style={styles.unlockButton} onPress={() => router.push('/premium')}>
            <Text style={styles.unlockButtonText}>💎 {t('cheersScreen.unlock')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>SipMate 🍻</Text>
          <Text style={styles.title}>{t('cheersScreen.title')}</Text>
          <Text style={styles.subtitle}>{t('cheersScreen.subtitle')}</Text>
        </View>

        {loading ? (
          <View style={styles.emptyBox}><Text style={styles.emptyEmoji}>🍻</Text><Text style={styles.emptyText}>{t('cheersScreen.loading')}</Text></View>
        ) : cheers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🍻</Text>
            <Text style={styles.emptyTitle}>{t('cheersScreen.noCheers')}</Text>
            <Text style={styles.emptyText}>{t('cheersScreen.noCheersDescription')}</Text>
            <TouchableOpacity style={styles.discoverButton} onPress={() => router.push('/nearby')}>
              <Text style={styles.discoverButtonText}>📍 {t('cheersScreen.findPeopleNearby')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statNumber}>{mutualCheers.length}</Text><Text style={styles.statLabel}>{t('cheersScreen.mutual')}</Text></View>
              <View style={styles.statBox}><Text style={styles.statNumber}>{receivedCheers.length}</Text><Text style={styles.statLabel}>{t('cheersScreen.received')}</Text></View>
              <View style={styles.statBox}><Text style={styles.statNumber}>{sentCheers.length}</Text><Text style={styles.statLabel}>{t('cheersScreen.sent')}</Text></View>
            </View>

            {mutualCheers.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>🍻 {t('cheersScreen.mutual')}</Text><Text style={styles.sectionCount}>{mutualCheers.length}</Text></View>
                <Text style={styles.sectionDescription}>{t('cheersScreen.mutualDescription')}</Text>
                {mutualCheers.map(renderCheersCard)}
              </View>
            )}
            {receivedCheers.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t('cheersScreen.received')}</Text><Text style={styles.sectionCount}>{receivedCheers.length}</Text></View>
                <Text style={styles.sectionDescription}>{t('cheersScreen.receivedDescription')}</Text>
                {receivedCheers.map(renderCheersCard)}
              </View>
            )}
            {sentCheers.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t('cheersScreen.sent')}</Text><Text style={styles.sectionCount}>{sentCheers.length}</Text></View>
                <Text style={styles.sectionDescription}>{t('cheersScreen.sentDescription')}</Text>
                {sentCheers.map(renderCheersCard)}
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={styles.refreshButton} onPress={loadCheers}><Text style={styles.refreshText}>↻ {t('cheersScreen.refresh')}</Text></TouchableOpacity>
        <Text style={styles.footer}>{t('cheersScreen.footer')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  container: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120 },
  header: { marginBottom: 28 },
  logo: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 26, letterSpacing: -0.5 },
  subtitle: { color: '#A1A1AA', marginTop: 8, fontSize: 14, lineHeight: 21 },
  statsRow: { flexDirection: 'row', marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginHorizontal: 4 },
  statNumber: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#71717A', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 5 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  sectionCount: { color: '#A1A1AA', fontSize: 12, fontWeight: '900', backgroundColor: '#27272A', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  sectionDescription: { color: '#71717A', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  card: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 22, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  cardMutual: { borderColor: '#EF4444', backgroundColor: '#1F1214' },
  cardLocked: { borderColor: '#3F3F46' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarMutual: { backgroundColor: '#EF4444' },
  avatarLocked: { backgroundColor: '#27272A' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  content: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  status: { color: '#A1A1AA', fontSize: 11, fontWeight: '800', marginTop: 3 },
  statusMutual: { color: '#F87171' },
  statusReceived: { color: '#D4D4D8' },
  detail: { color: '#71717A', fontSize: 11, lineHeight: 16, marginTop: 5 },
  chatButton: { backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginLeft: 10 },
  chatButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  unlockButton: { backgroundColor: '#27272A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginLeft: 10 },
  unlockButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  emptyBox: { alignItems: 'center', paddingVertical: 70 },
  emptyCard: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 24, padding: 28, alignItems: 'center' },
  emptyEmoji: { fontSize: 42, marginBottom: 12 },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  emptyText: { color: '#71717A', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  discoverButton: { marginTop: 18, backgroundColor: '#EF4444', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  discoverButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  refreshButton: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' },
  refreshText: { color: '#A1A1AA', fontSize: 11, fontWeight: '800' },
  footer: { color: '#3F3F46', fontSize: 10, textAlign: 'center', marginTop: 24 },
});
