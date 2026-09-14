import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';
import { FutureBackdrop } from '../components/FutureBackdrop';
import { ChatCardSkeleton } from '../components/Skeleton';

type ChatItem = {
  avatar_url: string | null;
  conversationId: string;
  userId: string;
  name: string;
  age: number | null;
  isActive: boolean;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
};

const copy = {
  en: {
    title: 'Chats',
    subtitle: 'Your SipMate conversations',
    loading: 'Loading chats...',
    emptyTitle: 'No chats yet',
    emptyText: 'Get a mutual CHEERS to start chatting.',
    noMessages: 'No messages yet 🍻',
    active: 'ACTIVE',
    refresh: 'Refresh',
    userFallback: 'SipMate User',
  },
  de: {
    title: 'Chats',
    subtitle: 'Deine SipMate-Unterhaltungen',
    loading: 'Chats werden geladen...',
    emptyTitle: 'Noch keine Chats',
    emptyText: 'Hol dir ein gegenseitiges CHEERS, um zu chatten.',
    noMessages: 'Noch keine Nachrichten 🍻',
    active: 'AKTIV',
    refresh: 'Aktualisieren',
    userFallback: 'SipMate-Nutzer',
  },
  hr: {
    title: 'Chatovi',
    subtitle: 'Tvoji SipMate razgovori',
    loading: 'Učitavanje chatova...',
    emptyTitle: 'Još nema chatova',
    emptyText: 'Ostvari uzajamni CHEERS za početak razgovora.',
    noMessages: 'Još nema poruka 🍻',
    active: 'AKTIVAN',
    refresh: 'Osvježi',
    userFallback: 'SipMate korisnik',
  },
} as const;

export default function ChatsScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedChatsRef = useRef(false);
  const chatsRequestIdRef = useRef(0);
  const chatsUserIdRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadChats(hasLoadedChatsRef.current);

      const channel = supabase
        .channel('chat-list-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          void loadChats(true);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
          void loadChats(true);
        })
        .subscribe();

      return () => {
        chatsRequestIdRef.current += 1;
        void supabase.removeChannel(channel);
      };
    }, [language])
  );

  async function loadChats(silent = false) {
    const requestId = ++chatsRequestIdRef.current;
    const isLatestRequest = () => requestId === chatsRequestIdRef.current;

    try {
      if (!silent) setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isLatestRequest()) return;
      if (!session?.user) {
        chatsUserIdRef.current = null;
        setChats([]);
        router.replace('/login');
        return;
      }

      const myId = session.user.id;
      const accountChanged =
        chatsUserIdRef.current !== null &&
        chatsUserIdRef.current !== myId;
      chatsUserIdRef.current = myId;
      if (accountChanged) {
        setChats([]);
        hasLoadedChatsRef.current = false;
      }

      const { data: chatRows, error: chatListError } = await supabase.rpc('get_chat_list');

      if (!isLatestRequest()) return;
      if (chatListError) {
        console.log('CHAT LIST ERROR:', chatListError.message);
        return;
      }

      const items: ChatItem[] = (chatRows ?? []).map((row: any) => ({
        conversationId: String(row.conversation_id),
        userId: String(row.user_id),
        name: row.name ?? text.userFallback,
        age: row.age ?? null,
        isActive: row.is_active === true,
        lastMessage: row.last_message ?? text.noMessages,
        lastMessageTime: row.last_message_time ?? null,
        unreadCount: Number(row.unread_count ?? 0),
        avatar_url: row.avatar_url ?? null,
      }));

      setChats(items);
    } finally {
      if (isLatestRequest()) {
        hasLoadedChatsRef.current = true;
        if (!silent) setLoading(false);
      }
    }
  }

  function openChat(item: ChatItem) {
    router.push({
      pathname: '/chat',
      params: { conversationId: item.conversationId },
    });
  }

  function formatTime(value: string | null) {
    if (!value) return '';

    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <View style={styles.screen}>
      <FutureBackdrop />
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbTop]} />
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbLow]} />
      <View pointerEvents="none" style={styles.scanAccent} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleRow}><Text style={styles.titleEmoji}>💬</Text><Text style={styles.title}>{text.title}</Text></View>
        <Text style={styles.subtitle}>{text.subtitle}</Text>

        {loading ? (
          <View>
            <ChatCardSkeleton />
            <ChatCardSkeleton />
            <ChatCardSkeleton />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🍻</Text>
            <Text style={styles.emptyTitle}>{text.emptyTitle}</Text>
            <Text style={styles.emptyText}>{text.emptyText}</Text>
          </View>
        ) : (
          chats.map((item) => (
            <Pressable
              key={item.conversationId}
              style={[
                styles.chatCard,
                item.unreadCount > 0 && styles.chatCardUnread,
              ]}
              onPress={() => openChat(item)}
            >
              {item.avatar_url ? (
                <Image
                  source={{
                    uri: `${item.avatar_url}${
                      item.avatar_url.includes('?') ? '&' : '?'
                    }refresh=${Date.now()}`,
                  }}
                  style={styles.chatAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.chatAvatarFallback}>
                  <Text style={styles.chatAvatarFallbackText}>
                    {item.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}

              <View style={styles.chatContent}>
                <View style={styles.topRow}>
                  <Text
                    style={[
                      styles.name,
                      item.unreadCount > 0 && styles.nameUnread,
                    ]}
                  >
                    {item.name}
                    {item.age ? `, ${item.age}` : ''}
                  </Text>

                  <Text style={styles.timeText}>
                    {formatTime(item.lastMessageTime)}
                  </Text>
                </View>

                <View style={styles.bottomRow}>
                  <Text
                    style={[
                      styles.lastMessage,
                      item.unreadCount > 0 && styles.lastMessageUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>

                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {item.isActive && (
                  <Text style={styles.activeText}>● {text.active}</Text>
                )}
              </View>
            </Pressable>
          ))
        )}

        <Pressable style={styles.refreshButton} onPress={() => void loadChats(false)}>
          <Text style={styles.refreshText}>↻ {text.refresh}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08090B',
  },
  ambientOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(220,38,38,0.09)',
    shadowColor: '#EF4444',
    shadowOpacity: 0.18,
    shadowRadius: 46,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  ambientOrbTop: { width: 250, height: 250, top: -95, right: -125 },
  ambientOrbLow: { width: 220, height: 220, top: 480, left: -135, backgroundColor: 'rgba(127,29,29,0.07)' },
  scanAccent: { position: 'absolute', top: 112, right: 22, width: 64, height: 1, backgroundColor: 'rgba(248,113,113,0.32)' },
  container: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingTop: 42,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, titleEmoji: { fontSize: 24 },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#A1A1AA',
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
  },
  chatCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,18,21,0.97)',
    padding: 14,
    borderRadius: 21,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2F2F34',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  chatContent: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  lastMessage: {
    flex: 1,
    color: '#A1A1AA',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 58,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  refreshButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#3A2A2D',
  },
  refreshText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  chatAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8,
  },
  timeText: {
    color: '#71717A',
    fontSize: 11,
    marginLeft: 10,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#F87171',
    shadowColor: '#EF4444',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  activeText: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  chatCardUnread: {
    borderWidth: 1,
    borderColor: '#5A2A2A',
    backgroundColor: '#161113',
    shadowColor: '#EF4444',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  nameUnread: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  lastMessageUnread: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});