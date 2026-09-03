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

import { supabase } from '../lib/supabase';

type CheersItem = {
  id: string;
  userId: string;
  name: string;
  age: number | null;
  status:
    | 'Mutual Cheers'
    | 'Sent'
    | 'Received';
};

export default function CheersScreen() {
  const { t } = useTranslation();
  const [cheers, setCheers] = useState<CheersItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

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

      const myId = session.user.id;
      const { data: myProfile, error: premiumError } = await supabase
        .from('profiles')
        .select('is_premium, premium_until')
        .eq('id', myId)
        .maybeSingle();

      if (premiumError) console.log('PREMIUM STATUS ERROR:', premiumError.message);

      const premiumActive = myProfile?.is_premium === true &&
        (!myProfile.premium_until || new Date(myProfile.premium_until) > new Date());
      setIsPremium(premiumActive);

      const { data: sent, error: sentError } = await supabase
        .from('cheers')
        .select('id, sender_id, receiver_id, created_at')
        .eq('sender_id', myId);
      if (sentError) {
        console.log('CHEERS SENT LOAD ERROR:', sentError.message);
        return;
      }

      const { data: received, error: receivedError } = await supabase
        .from('cheers')
        .select('id, sender_id, receiver_id, created_at')
        .eq('receiver_id', myId);
      if (receivedError) {
        console.log('CHEERS RECEIVED LOAD ERROR:', receivedError.message);
        return;
      }

      const sentToIds = new Set((sent ?? []).map((item) => item.receiver_id));
      const receivedFromIds = new Set((received ?? []).map((item) => item.sender_id));
      const allUserIds = Array.from(new Set([...Array.from(sentToIds), ...Array.from(receivedFromIds)]));

      if (allUserIds.length === 0) {
        setCheers([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, age')
        .in('id', allUserIds);
      if (profileError) {
        console.log('CHEERS PROFILE ERROR:', profileError.message);
        return;
      }

      const items: CheersItem[] = (profiles ?? []).map((profile) => {
        const iSent = sentToIds.has(profile.id);
        const iReceived = receivedFromIds.has(profile.id);
        const status: CheersItem['status'] = iSent && iReceived ? 'Mutual Cheers' : iSent ? 'Sent' : 'Received';
        return {
          id: profile.id,
          userId: profile.id,
          name: profile.name ?? t('cheersScreen.userFallback'),
          age: profile.age,
          status,
        };
      });

      const order = { 'Mutual Cheers': 0, Received: 1, Sent: 2 } as const;
      items.sort((a, b) => order[a.status] - order[b.status]);
      setCheers(items);
    } finally {
      setLoading(false);
    }
  }

  async function openChat(item: CheersItem) {
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
    const isLockedReceived = isReceived && !isPremium;

    function openProfile() {
      if (isLockedReceived) {
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
        {isMutual && (
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.7 },
  sectionCount: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#27272A', color: '#FFFFFF', textAlign: 'center', lineHeight: 24, fontSize: 11, fontWeight: '900', marginLeft: 9, paddingHorizontal: 6 },
  sectionDescription: { color: '#71717A', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', padding: 16, borderRadius: 22, marginBottom: 10, borderWidth: 1, borderColor: '#27272A' },
  cardMutual: { borderColor: '#7F1D1D', backgroundColor: '#1C1111' },
  cardLocked: { borderColor: '#92400E', backgroundColor: '#18130D' },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#3F3F46' },
  avatarMutual: { backgroundColor: '#450A0A', borderColor: '#DC2626' },
  avatarLocked: { backgroundColor: '#27272A', borderColor: '#F59E0B', opacity: 0.85 },
  avatarText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  content: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  status: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginTop: 5 },
  statusMutual: { color: '#EF4444' },
  statusReceived: { color: '#4ADE80' },
  detail: { color: '#71717A', fontSize: 12, lineHeight: 17, marginTop: 5 },
  chatButton: { backgroundColor: '#DC2626', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 16, marginLeft: 12 },
  chatButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  unlockButton: { backgroundColor: '#F59E0B', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 16, marginLeft: 12 },
  unlockButtonText: { color: '#09090B', fontSize: 11, fontWeight: '900' },
  emptyBox: { alignItems: 'center', paddingVertical: 70 },
  emptyCard: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 26, paddingVertical: 55, paddingHorizontal: 25, alignItems: 'center' },
  emptyEmoji: { fontSize: 58 },
  emptyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 18 },
  emptyText: { color: '#71717A', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  discoverButton: { backgroundColor: '#DC2626', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 18, marginTop: 24 },
  discoverButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  refreshButton: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 18, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' },
  refreshText: { color: '#A1A1AA', fontSize: 11, fontWeight: '900' },
  footer: { color: '#52525B', textAlign: 'center', fontSize: 11, fontWeight: '700', marginTop: 24 },
});
