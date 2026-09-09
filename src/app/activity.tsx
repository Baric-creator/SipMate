import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChatCardSkeleton } from '../components/Skeleton';
import { supabase } from '../lib/supabase';

type ActivityItem = {
  id: string;
  kind: 'message' | 'cheers' | 'mutual';
  userId: string;
  conversationId?: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
};

const copy = {
  en: {
    title: 'Activity',
    subtitle: 'Cheers and messages that need your attention.',
    emptyTitle: 'All caught up',
    emptyText: 'New Cheers and unread messages will show up here.',
    message: 'sent you a new message',
    cheers: 'sent you a Cheers 🍻',
    mutual: 'You got a CHEERS! 🍻',
    open: 'Open',
    user: 'SipMate User',
  },
  de: {
    title: 'Aktivität',
    subtitle: 'Cheers und Nachrichten, die deine Aufmerksamkeit brauchen.',
    emptyTitle: 'Alles erledigt',
    emptyText: 'Neue Cheers und ungelesene Nachrichten erscheinen hier.',
    message: 'hat dir eine neue Nachricht gesendet',
    cheers: 'hat dir ein Cheers gesendet 🍻',
    mutual: 'Ihr habt ein CHEERS! 🍻',
    open: 'Öffnen',
    user: 'SipMate-Nutzer',
  },
  hr: {
    title: 'Aktivnost',
    subtitle: 'Cheers i poruke koje čekaju tvoju pažnju.',
    emptyTitle: 'Sve je pregledano',
    emptyText: 'Novi Cheers i nepročitane poruke pojavit će se ovdje.',
    message: 'ti je poslao/la novu poruku',
    cheers: 'ti je poslao/la Cheers 🍻',
    mutual: 'Dobili ste CHEERS! 🍻',
    open: 'Otvori',
    user: 'SipMate korisnik',
  },
} as const;

export default function ActivityScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [])
  );

  async function loadActivity() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const myId = session.user.id;

      const [{ data: receivedCheers }, { data: sentCheers }, { data: conversations }] =
        await Promise.all([
          supabase
            .from('cheers')
            .select('id, sender_id, receiver_id, created_at')
            .eq('receiver_id', myId)
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('cheers')
            .select('sender_id, receiver_id')
            .eq('sender_id', myId),
          supabase
            .from('conversations')
            .select('id, user_one, user_two')
            .or(`user_one.eq.${myId},user_two.eq.${myId}`),
        ]);

      const sentTo = new Set((sentCheers ?? []).map((item) => item.receiver_id));
      const conversationIds = (conversations ?? []).map((item) => item.id);

      let unreadMessages: any[] = [];
      if (conversationIds.length) {
        const { data } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, created_at')
          .in('conversation_id', conversationIds)
          .neq('sender_id', myId)
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(30);
        unreadMessages = data ?? [];
      }

      const userIds = Array.from(new Set([
        ...(receivedCheers ?? []).map((item) => item.sender_id),
        ...unreadMessages.map((item) => item.sender_id),
      ]));

      const { data: profiles } = userIds.length
        ? await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', userIds)
        : { data: [] as any[] };

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      const cheersItems: ActivityItem[] = (receivedCheers ?? []).map((item) => {
        const profile = profileMap.get(item.sender_id);
        return {
          id: `cheers:${item.id}`,
          kind: sentTo.has(item.sender_id) ? 'mutual' : 'cheers',
          userId: item.sender_id,
          name: profile?.name ?? text.user,
          avatar_url: profile?.avatar_url ?? null,
          created_at: item.created_at,
        };
      });

      const messageItems: ActivityItem[] = unreadMessages.map((item) => {
        const profile = profileMap.get(item.sender_id);
        return {
          id: `message:${item.id}`,
          kind: 'message',
          userId: item.sender_id,
          conversationId: item.conversation_id,
          name: profile?.name ?? text.user,
          avatar_url: profile?.avatar_url ?? null,
          created_at: item.created_at,
        };
      });

      const merged = [...messageItems, ...cheersItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 40);

      setItems(merged);
      await AsyncStorage.setItem('sipmate:activity-seen-at', new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }

  function openItem(item: ActivityItem) {
    if (item.kind === 'message' && item.conversationId) {
      router.push({
        pathname: '/chat',
        params: {
          conversationId: item.conversationId,
          id: item.userId,
          name: item.name,
        },
      });
      return;
    }

    router.push({
      pathname: '/user-profile',
      params: { id: item.userId },
    });
  }

  function label(item: ActivityItem) {
    if (item.kind === 'message') return text.message;
    if (item.kind === 'mutual') return text.mutual;
    return text.cheers;
  }

  function time(value: string) {
    const date = new Date(value);
    const today = new Date();
    const sameDay =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    return sameDay
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>SipMate 🍻</Text>
            <Text style={styles.title}>{text.title}</Text>
            <Text style={styles.subtitle}>{text.subtitle}</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.list}>
            <ChatCardSkeleton />
            <ChatCardSkeleton />
            <ChatCardSkeleton />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>{text.emptyTitle}</Text>
            <Text style={styles.emptyText}>{text.emptyText}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <Pressable key={item.id} style={styles.item} onPress={() => openItem(item)}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.time}>{time(item.created_at)}</Text>
                  </View>
                  <Text style={[styles.detail, item.kind === 'mutual' && styles.detailMutual]}>
                    {label(item)}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08090B' },
  ambientOrb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(220,38,38,0.09)', shadowColor: '#EF4444', shadowOpacity: 0.18, shadowRadius: 44, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  ambientOrbTop: { width: 240, height: 240, top: -90, right: -120 },
  ambientOrbLow: { width: 210, height: 210, top: 430, left: -130, backgroundColor: 'rgba(127,29,29,0.07)' },
  scanAccent: { position: 'absolute', top: 108, left: 22, width: 58, height: 1, backgroundColor: 'rgba(248,113,113,0.32)' },
  container: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingTop: 34,
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  brand: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  title: { color: '#FFFFFF', fontSize: 29, fontWeight: '900', marginTop: 20, letterSpacing: -0.4 },
  subtitle: { color: '#8B8B94', fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 420 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121215', borderWidth: 1, borderColor: '#3A2A2D', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFFFFF', fontSize: 27, lineHeight: 29, fontWeight: '300' },
  list: { width: '100%' },
  item: { minHeight: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18,18,21,0.97)', borderWidth: 1, borderColor: '#2F2F34', borderRadius: 21, padding: 13, marginBottom: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#202024' },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#211315', borderWidth: 1, borderColor: '#3A2020', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  content: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', flexShrink: 1 },
  time: { color: '#66666E', fontSize: 10 },
  detail: { color: '#A1A1AA', fontSize: 12, lineHeight: 17, marginTop: 5 },
  detailMutual: { color: '#F87171', fontWeight: '800' },
  chevron: { color: '#52525B', fontSize: 25, marginLeft: 8 },
  emptyCard: { backgroundColor: '#121215', borderWidth: 1, borderColor: '#342326', borderRadius: 24, paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 22, elevation: 3 },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 16 },
  emptyText: { color: '#71717A', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
});
