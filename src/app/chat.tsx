import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';

import { showAlert } from '../lib/notify';
import { isProfileOnline } from '../lib/presence';
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
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const router = useRouter();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[lang] ?? copy.en;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState('SipMate');
  const [conversationVerified, setConversationVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserActive, setOtherUserActive] = useState(false);
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatChannelRef = useRef<any>(null);
  const messageSendingRef = useRef(false);
  const messagesRequestIdRef = useRef(0);
  const activeConversationIdRef = useRef('');

  useEffect(() => {
    let active = true;
    setConversationVerified(false);
    setMyUserId(null);
    setOtherUserId(null);
    setOtherUserName('SipMate');
    setOtherAvatar(null);
    setOtherUserActive(false);
    setOtherUserTyping(false);
    setIsBlocked(false);

    async function verifyConversation() {
      if (!conversationId) {
        if (active) setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const expectedUserId = session.user.id;
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('user_one, user_two')
        .eq('id', String(conversationId))
        .maybeSingle();

      if (!active) return;

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!active) return;
      if (currentSession?.user?.id !== expectedUserId) {
        setConversationVerified(false);
        return;
      }

      if (error || !conversation) {
        if (error) console.log('CONVERSATION VERIFY ERROR:', error.message);
        router.replace('/chats');
        return;
      }

      const myId = expectedUserId;
      if (conversation.user_one !== myId && conversation.user_two !== myId) {
        router.replace('/chats');
        return;
      }

      setMyUserId(myId);
      setOtherUserId(conversation.user_one === myId ? conversation.user_two : conversation.user_one);
      setConversationVerified(true);
    }

    void verifyConversation();
    return () => { active = false; };
  }, [conversationId, router]);

  useEffect(() => {
    if (!otherUserId) return;
    let active = true;
    async function loadOtherUser() {
      const { data, error } = await supabase.from('profiles').select('name, is_active, last_seen_at, active_until, avatar_url').eq('id', otherUserId).maybeSingle();
      if (!active) return;
      if (error) return console.log('OTHER USER PROFILE ERROR:', error.message);
      setOtherUserName(data?.name ?? 'SipMate');
      setOtherUserActive(isProfileOnline(data ?? {}));
      setOtherAvatar(data?.avatar_url ?? null);
    }
    void loadOtherUser();
    return () => { active = false; };
  }, [otherUserId]);

  useEffect(() => {
    if (!otherUserId || !myUserId) return;
    let active = true;
    async function checkBlockStatus() {
      const { data, error } = await supabase.rpc('is_blocked_between', { user_a: myUserId, user_b: otherUserId });
      if (!active) return;
      if (error) return console.log('BLOCK STATUS ERROR:', error.message);
      setIsBlocked(Boolean(data));
    }
    void checkBlockStatus();
    return () => { active = false; };
  }, [otherUserId, myUserId]);

  useFocusEffect(
    useCallback(() => {
      if (!otherUserId || !myUserId) return;
      let active = true;
      supabase.rpc('is_blocked_between', { user_a: myUserId, user_b: otherUserId }).then(({ data, error }) => {
        if (error) {
          console.log('BLOCK STATUS REFRESH ERROR:', error.message);
          return;
        }
        if (active) setIsBlocked(Boolean(data));
      });
      return () => { active = false; };
    }, [otherUserId, myUserId])
  );

  useEffect(() => {
    if (!otherUserId) return;
    const channel = supabase.channel(`profile-status-${otherUserId}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${otherUserId}`,
    }, (payload) => {
      const profile = payload.new as { is_active?: boolean | null; last_seen_at?: string | null; active_until?: string | null; avatar_url?: string | null };
      setOtherUserActive(isProfileOnline(profile));
      if (typeof profile.avatar_url !== 'undefined') setOtherAvatar(profile.avatar_url ?? null);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [otherUserId]);

  useEffect(() => {
    activeConversationIdRef.current = conversationId ? String(conversationId) : '';
    const requestId = ++messagesRequestIdRef.current;
    setMessages([]);
    setOtherUserTyping(false);

    if (!conversationId) {
      setLoading(false);
      return () => { messagesRequestIdRef.current += 1; };
    }
    if (!conversationVerified) {
      setLoading(true);
      return () => { messagesRequestIdRef.current += 1; };
    }

    void loadMessages(requestId);
    void markMessagesAsRead();

    return () => { messagesRequestIdRef.current += 1; };
  }, [conversationId, conversationVerified]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      void sendTypingStatus(false);
    };
  }, [conversationId, myUserId, conversationVerified]);

  useEffect(() => {
    if (!conversationId || !conversationVerified) return;
    const channel = supabase.channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${String(conversationId)}`,
      }, (payload) => {
        const incoming = payload.new as Message;
        if (incoming.conversation_id !== activeConversationIdRef.current) return;
        setMessages((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]);
        if (incoming.sender_id !== myUserId) void markMessagesAsRead();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${String(conversationId)}`,
      }, (payload) => {
        const updated = payload.new as Message;
        if (updated.conversation_id !== activeConversationIdRef.current) return;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (String(conversationId) !== activeConversationIdRef.current) return;
        if (payload && payload.userId !== myUserId) setOtherUserTyping(Boolean(payload.isTyping));
      }).subscribe();
    chatChannelRef.current = channel;
    return () => { chatChannelRef.current = null; void supabase.removeChannel(channel); };
  }, [conversationId, myUserId, conversationVerified]);

  async function loadMessages(requestId: number) {
    if (!conversationId) return;
    setLoading(true);
    const { data, error } = await supabase.from('messages').select('id, conversation_id, sender_id, content, created_at, read_at').eq('conversation_id', String(conversationId)).order('created_at', { ascending: true });
    if (requestId !== messagesRequestIdRef.current) return;
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
    if (!content || !conversationId || !conversationVerified || messageSendingRef.current || sendingMessage || isBlocked) return;

    messageSendingRef.current = true;
    try {
      setSendingMessage(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.id !== myUserId) {
        setConversationVerified(false);
        return;
      }
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: String(conversationId), sender_id: session.user.id, content,
      }).select('id, conversation_id, sender_id, content, created_at, read_at').single();
      if (error) {
        console.log('MESSAGE SEND ERROR:', error.message);
        const blocked = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
        showAlert(blocked ? text.blockedSend : `${text.sendError}: ${error.message}`);
        return;
      }
      const sent = data as Message;
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
      Vibration.vibrate(20);
      setMessageText('');

      void supabase.functions.invoke('send-message-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { messageId: String(sent.id) },
      }).then(({ error: notificationError }) => {
        if (notificationError) {
          console.log('MESSAGE PUSH ERROR:', notificationError.message);
        }
      }).catch((notificationError) => {
        console.log('MESSAGE PUSH CRASH:', notificationError);
      });

      await sendTypingStatus(false);
    } finally {
      messageSendingRef.current = false;
      setSendingMessage(false);
    }
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1742890188375-9b5817172055?auto=format&fit=crop&fm=jpg&q=82&w=1800' }}
        style={styles.chatBackdrop}
        imageStyle={styles.chatBackdropImage}
        resizeMode="cover"
      >
        <View style={styles.chatBackdropShade} />
        <View style={styles.chatBackdropBrand}>
          <View style={styles.chatBackdropLogoWrap}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.chatBackdropLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.chatBackdropKicker}>SIPMATE</Text>
          <Text style={styles.chatBackdropCheers}>CHEERS</Text>
          <Text style={styles.chatBackdropSub}>🍻 GOOD PEOPLE. GOOD TIMES.</Text>
        </View>
      </ImageBackground>

      <View style={styles.header}>
        <TouchableOpacity style={styles.chatHeaderUser} activeOpacity={0.8} onPress={() => {
          if (otherUserId) router.push({ pathname: '/user-profile', params: { id: otherUserId } });
        }}>
          {otherAvatar ? (
            <Image source={{ uri: otherAvatar }} style={styles.headerAvatar} resizeMode="cover" />
          ) : (
            <View style={styles.headerAvatarFallback}><Text style={styles.headerAvatarFallbackText}>{otherUserName.charAt(0).toUpperCase()}</Text></View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <Text style={[styles.status, { color: otherUserActive ? '#22C55E' : '#71717A' }]}>● {otherUserActive ? text.active : text.inactive}</Text>
            <View style={styles.connectedRow}><Text style={styles.connectedEmoji}>🍻</Text><Text style={styles.connectedText}>{text.connected}</Text></View>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
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

      {otherUserTyping && <View style={styles.typingContainer}><Text style={styles.typingText}>{otherUserName} {text.typing}</Text></View>}

      {isBlocked ? (
        <View style={styles.blockedBar}><Text style={styles.blockedText}>{text.blocked}</Text></View>
      ) : (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={messageText}
            onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120)}
            onChangeText={(value) => {
              setMessageText(value);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (!value.trim()) {
                void sendTypingStatus(false);
                typingTimeoutRef.current = null;
                return;
              }
              void sendTypingStatus(true);
              typingTimeoutRef.current = setTimeout(() => {
                void sendTypingStatus(false);
                typingTimeoutRef.current = null;
              }, 1200);
            }}
            placeholder={text.placeholder}
            placeholderTextColor="#71717A"
            maxLength={1000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sendingMessage) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sendingMessage}
            activeOpacity={0.8}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08090B' },
  chatBackdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 1,
  },
  chatBackdropImage: {
    opacity: 0.24,
  },
  chatBackdropShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,9,11,0.64)',
  },
  chatBackdropBrand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '39%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBackdropLogoWrap: {
    width: 86,
    height: 86,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(8,9,11,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  chatBackdropLogo: {
    width: 70,
    height: 70,
    opacity: 0.28,
  },
  chatBackdropKicker: {
    color: 'rgba(255,255,255,0.24)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
  },
  chatBackdropCheers: {
    color: 'rgba(239,68,68,0.17)',
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 2,
  },
  chatBackdropSub: {
    color: 'rgba(255,255,255,0.12)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginTop: 5,
  },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2B2224', backgroundColor: '#0B0B0E' },
  chatHeaderUser: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#202024', borderWidth: 1, borderColor: '#34343A' },
  headerAvatarFallback: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#211315', borderWidth: 1, borderColor: '#3A2020', alignItems: 'center', justifyContent: 'center' },
  headerAvatarFallbackText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  headerInfo: { flex: 1 },
  headerName: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginBottom: 2 },
  status: { fontSize: 12, fontWeight: '700' },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, connectedEmoji: { fontSize: 14 },
  connectedText: { color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.4, marginTop: 3 },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 46, marginBottom: 12 },
  emptyTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginBottom: 8 },
  emptyText: { color: '#71717A', fontSize: 14, textAlign: 'center' },
  dateSeparator: { alignItems: 'center', marginVertical: 15 },
  dateSeparatorText: { color: '#71717A', backgroundColor: '#121215', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '700' },
  messageRow: { width: '100%', marginBottom: 8 },
  messageRowMine: { alignItems: 'flex-end' },
  messageRowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, borderRadius: 20 },
  bubbleMine: { backgroundColor: '#E33A3A', borderBottomRightRadius: 6, borderWidth: 1, borderColor: '#F87171', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  bubbleOther: { backgroundColor: '#151519', borderWidth: 1, borderColor: '#303036', borderBottomLeftRadius: 6 },
  messageText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  messageMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
  messageTime: { color: '#D4D4D8', fontSize: 9, opacity: 0.8 },
  readStatus: { fontSize: 12, marginLeft: 5, fontWeight: '900' },
  readStatusSent: { color: '#D4D4D8' },
  readStatusRead: { color: '#38BDF8' },
  typingContainer: { paddingHorizontal: 18, paddingVertical: 7, backgroundColor: '#08090B' },
  typingText: { color: '#A1A1AA', fontSize: 12, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#2B2224', backgroundColor: '#0B0B0E' },
  input: { flex: 1, minHeight: 50, backgroundColor: '#151519', borderWidth: 1, borderColor: '#34343A', borderRadius: 25, paddingHorizontal: 16, color: '#FFFFFF', fontSize: 15, outlineStyle: 'none' as any },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DC2626', borderWidth: 1, borderColor: '#F87171', alignItems: 'center', justifyContent: 'center', marginLeft: 9, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 9, elevation: 3 },
  sendButtonDisabled: { opacity: 0.35 },
  sendText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  blockedBar: { paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#27272A', backgroundColor: '#18181B' },
  blockedText: { color: '#EF4444', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
});

