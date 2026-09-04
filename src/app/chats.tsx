import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrivateProfileImage } from '../components/private-profile-image';
import { getChatList } from '../lib/privacy-profile-api';
import { supabase } from '../lib/supabase';

type ChatItem = {
  avatar_url: string | null;
  avatar_path: string | null;
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
  en: { title: 'Chats', subtitle: 'Your SipMate conversations', loading: 'Loading chats...', emptyTitle: 'No chats yet', emptyText: 'Get a mutual CHEERS to start chatting.', noMessages: 'No messages yet 🍻', active: 'ACTIVE', refresh: 'Refresh', userFallback: 'SipMate User' },
  de: { title: 'Chats', subtitle: 'Deine SipMate-Unterhaltungen', loading: 'Chats werden geladen...', emptyTitle: 'Noch keine Chats', emptyText: 'Hol dir ein gegenseitiges CHEERS, um zu chatten.', noMessages: 'Noch keine Nachrichten 🍻', active: 'AKTIV', refresh: 'Aktualisieren', userFallback: 'SipMate-Nutzer' },
  hr: { title: 'Chatovi', subtitle: 'Tvoji SipMate razgovori', loading: 'Učitavanje chatova...', emptyTitle: 'Još nema chatova', emptyText: 'Ostvari uzajamni CHEERS za početak razgovora.', noMessages: 'Još nema poruka 🍻', active: 'AKTIVAN', refresh: 'Osvježi', userFallback: 'SipMate korisnik' },
} as const;

export default function ChatsScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadChats(); }, []);

  useEffect(() => {
    const channel = supabase.channel('chat-list-updates').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { loadChats(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadChats() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const rows = await getChatList();
      const items = rows.map((row): ChatItem => ({
        conversationId: row.conversation_id,
        userId: row.user_id,
        name: row.name ?? text.userFallback,
        age: row.age,
        isActive: row.is_active ?? false,
        avatar_url: row.avatar_url,
        avatar_path: row.avatar_path ?? null,
        lastMessage: row.last_message ?? text.noMessages,
        lastMessageTime: row.last_message_time,
        unreadCount: Number(row.unread_count ?? 0),
      }));
      setChats(items);
    } catch (error) {
      console.log('LOAD CHATS ERROR:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }

  function openChat(item: ChatItem) {
    const url = `/chat?conversationId=${encodeURIComponent(item.conversationId)}` + `&id=${encodeURIComponent(item.userId)}` + `&name=${encodeURIComponent(item.name)}`;
    router.push(url as any);
  }

  function formatTime(value: string | null) {
    if (!value) return '';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>💬 {text.title}</Text>
        <Text style={styles.subtitle}>{text.subtitle}</Text>
        {loading ? <Text style={styles.emptyText}>{text.loading}</Text> : chats.length === 0 ? (
          <View style={styles.emptyBox}><Text style={styles.emptyEmoji}>🍻</Text><Text style={styles.emptyTitle}>{text.emptyTitle}</Text><Text style={styles.emptyText}>{text.emptyText}</Text></View>
        ) : chats.map((item) => (
          <Pressable key={item.conversationId} style={[styles.chatCard, item.unreadCount > 0 && styles.chatCardUnread]} onPress={() => openChat(item)}>
            {(item.avatar_path || item.avatar_url) ? (
              <PrivateProfileImage storagePath={item.avatar_path} legacyUrl={item.avatar_url} style={styles.chatAvatar} resizeMode="cover" />
            ) : (
              <View style={styles.chatAvatarFallback}><Text style={styles.chatAvatarFallbackText}>{item.name?.charAt(0).toUpperCase() || '?'}</Text></View>
            )}
            <View style={styles.chatContent}>
              <View style={styles.topRow}><Text style={[styles.name, item.unreadCount > 0 && styles.nameUnread]}>{item.name}{item.age ? `, ${item.age}` : ''}</Text><Text style={styles.timeText}>{formatTime(item.lastMessageTime)}</Text></View>
              <View style={styles.bottomRow}><Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]} numberOfLines={1}>{item.lastMessage}</Text>{item.unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View>}</View>
              {item.isActive && <Text style={styles.activeText}>● {text.active}</Text>}
            </View>
          </Pressable>
        ))}
        <Pressable style={styles.refreshButton} onPress={loadChats}><Text style={styles.refreshText}>↻ {text.refresh}</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  container: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#A1A1AA', marginTop: 8, marginBottom: 28, fontSize: 15 },
  chatCard: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', padding: 16, borderRadius: 22, marginBottom: 12 },
  chatContent: { flex: 1, minWidth: 0 },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  lastMessage: { flex: 1, color: '#A1A1AA', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 58 },
  emptyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 18 },
  emptyText: { color: '#71717A', fontSize: 14, textAlign: 'center', marginTop: 8 },
  refreshButton: { alignSelf: 'center', marginTop: 20, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 20, backgroundColor: '#27272A' },
  refreshText: { color: '#FFFFFF', fontWeight: '700' },
  chatAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  chatAvatarFallback: { width: 52, height: 52, borderRadius: 26, marginRight: 12, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  chatAvatarFallbackText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 },
  timeText: { color: '#71717A', fontSize: 11, marginLeft: 10 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  activeText: { color: '#22C55E', fontSize: 10, fontWeight: '800', marginTop: 5 },
  chatCardUnread: { borderWidth: 1, borderColor: '#DC2626' },
  nameUnread: { color: '#FFFFFF', fontWeight: '900' },
  lastMessageUnread: { color: '#FFFFFF', fontWeight: '800' },
});