import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

type Message = {
  id: number | string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

const copy = {
  en: {
    active: 'ACTIVE — Ready for a drink', inactive: 'INACTIVE', connected: 'CHEERS connected',
    loading: 'Loading messages...', empty: 'No messages yet. Say hi 👋', today: 'Today', yesterday: 'Yesterday',
    typing: 'is typing... 💬', blocked: '🚫 Messaging is unavailable because one of you has blocked the other.',
    placeholder: 'Write a message...', blockedSend: "🚫 You can't send messages to this user because one of you has blocked the other.",
    sendError: 'Message could not be sent',
  },
  de: {
    active: 'AKTIV — Bereit für einen Drink', inactive: 'INAKTIV', connected: 'CHEERS verbunden',
    loading: 'Nachrichten werden geladen...', empty: 'Noch keine Nachrichten. Sag Hallo 👋', today: 'Heute', yesterday: 'Gestern',
    typing: 'tippt gerade... 💬', blocked: '🚫 Nachrichten sind nicht verfügbar, weil einer von euch den anderen blockiert hat.',
    placeholder: 'Nachricht schreiben...', blockedSend: '🚫 Du kannst diesem Nutzer keine Nachrichten senden, weil einer von euch den anderen blockiert hat.',
    sendError: 'Nachricht konnte nicht gesendet werden',
  },
  hr: {
    active: 'AKTIVAN — Spreman za piće', inactive: 'NEAKTIVAN', connected: 'CHEERS povezani',
    loading: 'Učitavanje poruka...', empty: 'Još nema poruka. Reci bok 👋', today: 'Danas', yesterday: 'Jučer',
    typing: 'piše... 💬', blocked: '🚫 Dopisivanje nije dostupno jer je jedan od vas blokirao drugoga.',
    placeholder: 'Napiši poruku...', blockedSend: '🚫 Ne možeš slati poruke ovom korisniku jer je jedan od vas blokirao drugoga.',
    sendError: 'Poruka nije mogla biti poslana',
  },
} as const;

export default function ChatScreen() {
  const { conversationId, name, id } = useLocalSearchParams<{ conversationId?: string; name?: string; id?: string }>();
  const router = useRouter();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[lang] ?? copy.en;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserActive, setOtherUserActive] = useState(false);
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatChannelRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMyUserId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!id) return;
    async function loadOtherUser() {
      const { data, error } = await supabase.from('profiles').select('is_active, avatar_url').eq('id', String(id)).maybeSingle();
      if (error) return console.log('OTHER USER PROFILE ERROR:', error.message);
      setOtherUserActive(data?.is_active ?? false);
      setOtherAvatar(data?.avatar_url ?? null);
    }
    loadOtherUser();
  }, [id]);

  useEffect(() => {
    if (!id || !myUserId) return;
    async function checkBlockStatus() {
      const { data, error } = await supabase.rpc('is_blocked_between', { user_a: myUserId, user_b: String(id) });
      if (error) return console.log('BLOCK STATUS ERROR:', error.message);
      setIsBlocked(Boolean(data));
    }
    checkBlockStatus();
  }, [id, myUserId]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`profile-status-${id}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${String(id)}`,
    }, (payload) => {
      const profile = payload.new as { is_active?: boolean | null; avatar_url?: string | null };
      setOtherUserActive(profile.is_active ?? false);
      if (typeof profile.avatar_url !== 'undefined') setOtherAvatar(profile.avatar_url ?? null);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!conversationId) { setLoading(false); return; }
    loadMessages();
    markMessagesAsRead();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${String(conversationId)}`,
      }, (payload) => {
        const incoming = payload.new as Message;
        setMessages((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]);
        if (incoming.sender_id !== myUserId) markMessagesAsRead();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${String(conversationId)}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload && payload.userId !== myUserId) setOtherUserTyping(Boolean(payload.isTyping));
      }).subscribe();
    chatChannelRef.current = channel;
    return () => { chatChannelRef.current = null; supabase.removeChannel(channel); };
  }, [conversationId, myUserId]);

  async function loadMessages() {
    if (!conversationId) return;
    setLoading(true);
    const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', String(conversationId)).order('created_at', { ascending: true });
    if (error) console.log('MESSAGES LOAD ERROR:', error.message);
    else setMessages((data ?? []) as Message[]);
    setLoading(false);
  }

  async function markMessagesAsRead() {
    if (!conversationId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('conversation_id', String(conversationId)).neq('sender_id', session.user.id).is('read_at', null);
    if (error) console.log('MARK READ ERROR:', error.message);
  }

  async function sendMessage() {
    const content = messageText.trim();
    if (!content || !conversationId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: String(conversationId), sender_id: session.user.id, content,
    }).select('*').single();
    if (error) {
      console.log('MESSAGE SEND ERROR:', error.message);
      if (typeof window !== 'undefined') {
        const blocked = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
        window.alert(blocked ? text.blockedSend : `${text.sendError}: ${error.message}`);
      }
      return;
    }
    const sent = data as Message;
    setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
    setMessageText('');
    await sendTypingStatus(false);
  }

  async function sendTypingStatus(isTyping: boolean) {
    if (!conversationId || !myUserId || !chatChannelRef.current) return;
    try {
      await chatChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: myUserId, isTyping } });
    } catch (error) { console.log('TYPING STATUS ERROR:', error); }
  }

  function getDateLabel(dateString: string) {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(messageDate, today)) return text.today;
    if (sameDay(messageDate, yesterday)) return text.yesterday;
    return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.chatHeaderUser} activeOpacity={0.8} onPress={() => {
          if (id) router.push({ pathname: '/user-profile', params: { id: String(id) } });
        }}>
          {otherAvatar ? (
            <Image source={{ uri: `${otherAvatar}${otherAvatar.includes('?') ? '&' : '?'}refresh=${Date.now()}` }} style={styles.headerAvatar} resizeMode="cover" />
          ) : (
            <View style={styles.headerAvatarFallback}><Text style={styles.headerAvatarFallbackText}>{String(name || '?').charAt(0).toUpperCase()}</Text></View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{String(name || 'SipMate')}</Text>
            <Text style={[styles.status, { color: otherUserActive ? '#22C55E' : '#71717A' }]}>● {otherUserActive ? text.active : text.inactive}</Text>
            <Text style={styles.connectedText}>🍻 {text.connected}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.messages} contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        {loading ? <Text style={styles.emptyText}>{text.loading}</Text> : messages.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={styles.emptyEmoji}>🍻</Text><Text style={styles.emptyTitle}>CHEERS!</Text><Text style={styles.emptyText}>{text.empty}</Text></View>
        ) : messages.map((item, index) => {
          const mine = item.sender_id === myUserId;
          const previous = index > 0 ? messages[index - 1] : null;
          const showDate = !previous || getDateLabel(previous.created_at) !== getDateLabel(item.created_at);
          return <View key={String(item.id)}>
            {showDate && <View style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>{getDateLabel(item.created_at)}</Text></View>}
            <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={styles.messageText}>{item.content}</Text>
                <View style={styles.messageMeta}>
                  <Text style={styles.messageTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  {mine && <Text style={[styles.readStatus, item.read_at ? styles.readStatusRead : styles.readStatusSent]}>{item.read_at ? '✓✓' : '✓'}</Text>}
                </View>
              </View>
            </View>
          </View>;
        })}
      </ScrollView>

      {otherUserTyping && <View style={styles.typingContainer}><Text style={styles.typingText}>{String(name || 'SipMate')} {text.typing}</Text></View>}

      {isBlocked ? (
        <View style={styles.blockedBar}><Text style={styles.blockedText}>{text.blocked}</Text></View>
      ) : (
        <View style={styles.inputBar}>
          <TextInput style={styles.input} value={messageText} onChangeText={(value) => {
            setMessageText(value); sendTypingStatus(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 1200);
          }} placeholder={text.placeholder} placeholderTextColor="#71717A" onSubmitEditing={sendMessage} returnKeyType="send" />
          <TouchableOpacity style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!messageText.trim()} activeOpacity={0.8}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#27272A', backgroundColor: '#09090B' },
  chatHeaderUser: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#27272A', borderWidth: 2, borderColor: '#DC2626' },
  headerAvatarFallback: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#450A0A', borderWidth: 2, borderColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  headerAvatarFallbackText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  headerInfo: { flex: 1 },
  headerName: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginBottom: 2 },
  status: { fontSize: 12, fontWeight: '700' },
  connectedText: { color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.4, marginTop: 3 },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 46, marginBottom: 12 },
  emptyTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginBottom: 8 },
  emptyText: { color: '#71717A', fontSize: 14, textAlign: 'center' },
  dateSeparator: { alignItems: 'center', marginVertical: 15 },
  dateSeparatorText: { color: '#71717A', backgroundColor: '#18181B', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '700' },
  messageRow: { width: '100%', marginBottom: 8 },
  messageRowMine: { alignItems: 'flex-end' },
  messageRowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, borderRadius: 18 },
  bubbleMine: { backgroundColor: '#DC2626', borderBottomRightRadius: 5, borderWidth: 1, borderColor: '#EF4444' },
  bubbleOther: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderBottomLeftRadius: 5 },
  messageText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  messageMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
  messageTime: { color: '#D4D4D8', fontSize: 9, opacity: 0.8 },
  readStatus: { fontSize: 12, marginLeft: 5, fontWeight: '900' },
  readStatusSent: { color: '#D4D4D8' },
  readStatusRead: { color: '#38BDF8' },
  typingContainer: { paddingHorizontal: 18, paddingVertical: 7, backgroundColor: '#09090B' },
  typingText: { color: '#A1A1AA', fontSize: 12, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#27272A', backgroundColor: '#09090B' },
  input: { flex: 1, minHeight: 46, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 23, paddingHorizontal: 16, color: '#FFFFFF', fontSize: 15, outlineStyle: 'none' as any },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', marginLeft: 9 },
  sendButtonDisabled: { opacity: 0.35 },
  sendText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  blockedBar: { paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#27272A', backgroundColor: '#18181B' },
  blockedText: { color: '#EF4444', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
});