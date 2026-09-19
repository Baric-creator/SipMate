import * as ImagePicker from 'expo-image-picker';
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

import { chooseOption, showAlert } from '../lib/notify';
import { isProfileOnline } from '../lib/presence';
import { supabase } from '../lib/supabase';
import { loadAppRemoteConfig } from '../lib/remote-config';

type Message = {
  id: number | string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  message_type?: 'text' | 'image';
  image_path?: string | null;
  image_ai_score?: number | null;
  image_moderation_status?: string | null;
};

const copy = {
  en: {
    active: 'ACTIVE — Ready for a drink', inactive: 'INACTIVE', connected: 'CHEERS connected',
    loading: 'Loading messages...', empty: 'No messages yet. Say hi 👋', today: 'Today', yesterday: 'Yesterday',
    typing: 'is typing... 💬', blocked: '🚫 Messaging is unavailable because one of you has blocked the other.',
    placeholder: 'Write a message...', blockedSend: "🚫 You can't send messages to this user because one of you has blocked the other.",
    sendError: 'Message could not be sent',
    photoPremium: 'Photo sharing is a Premium feature.',
    photoBothPremium: 'Both people need Premium to share photos.',
    photoMutual: 'Verified photos unlock after a mutual CHEERS.',
    photoVerifying: 'Checking photo authenticity…',
    photoRejectedAi: 'This photo looks AI-generated or AI-edited, so it was not sent.',
    photoRejectedUnsafe: 'This photo could not be sent because it did not pass the safety check.',
    photoNotConfigured: 'Verified photo sharing is almost ready. Image verification still needs to be activated.',
    photoTooLarge: 'Photo must be 5 MB or smaller.',
    photoType: 'Use a JPG, PNG or WebP image.',
    photoError: 'Photo could not be sent.',
    verifiedPhoto: 'VERIFIED PHOTO',
    photoLoading: 'Loading secure photo…',
    photoRetry: 'Tap to retry',
    cancel: 'Cancel',
    reportPhoto: 'Report photo',
    reportPhotoConfirm: 'Choose why you are reporting this photo.',
    reportSexual: 'Sexual or explicit content',
    reportHarassment: 'Harassment or abusive content',
    reportSpamScam: 'Spam, scam or misleading content',
    reportOther: 'Other safety concern',
    reportPhotoSent: 'Photo reported. Thank you for helping keep SipMate safe.',
    reportPhotoDuplicate: 'You already reported this photo.',
    photoRemoved: 'Photo removed by moderation',
    reportLimit: 'You reached the photo report limit for today. Try again later.',
  },
  de: {
    active: 'AKTIV — Bereit für einen Drink', inactive: 'INAKTIV', connected: 'CHEERS verbunden',
    loading: 'Nachrichten werden geladen...', empty: 'Noch keine Nachrichten. Sag Hallo 👋', today: 'Heute', yesterday: 'Gestern',
    typing: 'tippt gerade... 💬', blocked: '🚫 Nachrichten sind nicht verfügbar, weil einer von euch den anderen blockiert hat.',
    placeholder: 'Nachricht schreiben...', blockedSend: '🚫 Du kannst diesem Nutzer keine Nachrichten senden, weil einer von euch den anderen blockiert hat.',
    sendError: 'Nachricht konnte nicht gesendet werden',
    photoPremium: 'Fotos im Chat sind eine Premium-Funktion.',
    photoBothPremium: 'Beide Personen brauchen Premium, um Fotos zu teilen.',
    photoMutual: 'Verifizierte Fotos werden nach einem gegenseitigen CHEERS freigeschaltet.',
    photoVerifying: 'Foto wird auf Echtheit geprüft…',
    photoRejectedAi: 'Dieses Foto wirkt KI-generiert oder KI-bearbeitet und wurde nicht gesendet.',
    photoRejectedUnsafe: 'Dieses Foto hat die Sicherheitsprüfung nicht bestanden.',
    photoNotConfigured: 'Verifizierte Fotos sind fast bereit. Die Bildprüfung muss noch aktiviert werden.',
    photoTooLarge: 'Das Foto darf maximal 5 MB groß sein.',
    photoType: 'Bitte JPG, PNG oder WebP verwenden.',
    photoError: 'Foto konnte nicht gesendet werden.',
    verifiedPhoto: 'VERIFIZIERTES FOTO',
    photoLoading: 'Sicheres Foto wird geladen…',
    photoRetry: 'Zum erneuten Laden tippen',
    cancel: 'Abbrechen',
    reportPhoto: 'Foto melden',
    reportPhotoConfirm: 'Warum möchtest du dieses Foto melden?',
    reportSexual: 'Sexuelle oder explizite Inhalte',
    reportHarassment: 'Belästigung oder beleidigende Inhalte',
    reportSpamScam: 'Spam, Betrug oder irreführende Inhalte',
    reportOther: 'Anderes Sicherheitsproblem',
    reportPhotoSent: 'Foto gemeldet. Danke, dass du SipMate sicher hältst.',
    reportPhotoDuplicate: 'Du hast dieses Foto bereits gemeldet.',
    photoRemoved: 'Foto wurde von der Moderation entfernt',
    reportLimit: 'Du hast das Foto-Meldelimit für heute erreicht. Versuch es später erneut.',
  },
  hr: {
    active: 'AKTIVAN — Spreman za piće', inactive: 'NEAKTIVAN', connected: 'CHEERS povezani',
    loading: 'Učitavanje poruka...', empty: 'Još nema poruka. Reci bok 👋', today: 'Danas', yesterday: 'Jučer',
    typing: 'piše... 💬', blocked: '🚫 Dopisivanje nije dostupno jer je jedan od vas blokirao drugoga.',
    placeholder: 'Napiši poruku...', blockedSend: '🚫 Ne možeš slati poruke ovom korisniku jer je jedan od vas blokirao drugoga.',
    sendError: 'Poruka nije mogla biti poslana',
    photoPremium: 'Slanje slika u chatu je Premium opcija.',
    photoBothPremium: 'Oba korisnika moraju imati Premium za razmjenu slika.',
    photoMutual: 'Verified slike se otključavaju tek nakon uzajamnog CHEERS-a.',
    photoVerifying: 'Provjeravam autentičnost slike…',
    photoRejectedAi: 'Slika izgleda kao AI-generirana ili AI-uređena pa nije poslana.',
    photoRejectedUnsafe: 'Slika nije prošla sigurnosnu provjeru i nije poslana.',
    photoNotConfigured: 'Verified Photo Sharing je skoro spreman. Još treba aktivirati provjeru slika.',
    photoTooLarge: 'Slika mora biti 5 MB ili manja.',
    photoType: 'Koristi JPG, PNG ili WebP sliku.',
    photoError: 'Slika nije mogla biti poslana.',
    verifiedPhoto: 'VERIFIED PHOTO',
    photoLoading: 'Učitavam sigurnu sliku…',
    photoRetry: 'Dodirni za ponovni pokušaj',
    cancel: 'Odustani',
    reportPhoto: 'Prijavi sliku',
    reportPhotoConfirm: 'Odaberi razlog prijave ove fotografije.',
    reportSexual: 'Seksualni ili eksplicitni sadržaj',
    reportHarassment: 'Uznemiravanje ili uvredljiv sadržaj',
    reportSpamScam: 'Spam, prevara ili obmanjujući sadržaj',
    reportOther: 'Drugi sigurnosni razlog',
    reportPhotoSent: 'Slika je prijavljena. Hvala što pomažeš da SipMate ostane siguran.',
    reportPhotoDuplicate: 'Ovu sliku si već prijavio.',
    photoRemoved: 'Slika je uklonjena od strane moderacije',
    reportLimit: 'Dosegnuo si dnevni limit prijava fotografija. Pokušaj ponovno kasnije.',
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
  const [sendingImage, setSendingImage] = useState(false);
  const [myPremium, setMyPremium] = useState(false);
  const [otherPremium, setOtherPremium] = useState(false);
  const [mutualCheers, setMutualCheers] = useState(false);
  const [verifiedPhotosEnabled, setVerifiedPhotosEnabled] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imageLoadState, setImageLoadState] = useState<Record<string, 'idle' | 'loading' | 'error'>>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatChannelRef = useRef<any>(null);
  const messageSendingRef = useRef(false);
  const messagesRequestIdRef = useRef(0);
  const activeConversationIdRef = useRef('');
  const imageRefreshAttemptRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void loadAppRemoteConfig().then((config) => {
      if (active) setVerifiedPhotosEnabled(config.featureFlags.verified_photos);
    });
    return () => { active = false; };
  }, []);

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
    setMyPremium(false);
    setOtherPremium(false);
    setMutualCheers(false);
    setImageUrls({});
    setImageLoadState({});
    imageRefreshAttemptRef.current.clear();

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
    if (!otherUserId || !myUserId || !conversationVerified) return;
    let active = true;
    const premiumNow = (p: { is_premium?: boolean | null; premium_until?: string | null } | undefined) =>
      p?.is_premium === true && (!p.premium_until || new Date(p.premium_until) > new Date());

    async function loadPhotoAccess() {
      const [{ data: profiles, error: profilesError }, { data: cheers, error: cheersError }] = await Promise.all([
        supabase.from('profiles').select('id, is_premium, premium_until').in('id', [myUserId, otherUserId]),
        supabase.from('cheers').select('sender_id, receiver_id').or(
          `and(sender_id.eq.${myUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myUserId})`
        ),
      ]);
      if (!active) return;
      if (profilesError) console.log('PHOTO PREMIUM CHECK ERROR:', profilesError.message);
      if (cheersError) console.log('PHOTO CHEERS CHECK ERROR:', cheersError.message);
      const mine = (profiles ?? []).find((p: any) => p.id === myUserId);
      const other = (profiles ?? []).find((p: any) => p.id === otherUserId);
      setMyPremium(premiumNow(mine));
      setOtherPremium(premiumNow(other));
      const rows = cheers ?? [];
      setMutualCheers(
        rows.some((c: any) => c.sender_id === myUserId && c.receiver_id === otherUserId) &&
        rows.some((c: any) => c.sender_id === otherUserId && c.receiver_id === myUserId)
      );
    }
    void loadPhotoAccess();
    return () => { active = false; };
  }, [otherUserId, myUserId, conversationVerified]);

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
        if (incoming.message_type === 'image') void loadImageUrl(incoming);
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
    const { data, error } = await supabase.from('messages').select('id, conversation_id, sender_id, content, created_at, read_at, message_type, image_path, image_ai_score, image_moderation_status').eq('conversation_id', String(conversationId)).order('created_at', { ascending: true });
    if (requestId !== messagesRequestIdRef.current) return;
    if (error) console.log('MESSAGES LOAD ERROR:', error.message);
    else {
      const rows = (data ?? []) as Message[];
      setMessages(rows);
      void Promise.all(rows.filter((m) => m.message_type === 'image').map((m) => loadImageUrl(m)));
    }
    setLoading(false);
  }

  async function loadImageUrl(message: Message, force = false) {
    const id = String(message.id);
    if (message.message_type !== 'image' || (!force && imageUrls[id]) || imageLoadState[id] === 'loading') return;
    setImageLoadState((current) => ({ ...current, [id]: 'loading' }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setImageLoadState((current) => ({ ...current, [id]: 'error' }));
      return;
    }
    const { data, error } = await supabase.functions.invoke('chat-image-url', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { messageId: id },
    });
    if (error || !data?.ok || !data?.url) {
      if (error) console.log('CHAT IMAGE URL ERROR:', error.message);
      setImageLoadState((current) => ({ ...current, [id]: 'error' }));
      return;
    }
    setImageUrls((current) => ({ ...current, [id]: data.url }));
    setImageLoadState((current) => ({ ...current, [id]: 'idle' }));
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
      }).select('id, conversation_id, sender_id, content, created_at, read_at, message_type, image_path, image_ai_score, image_moderation_status').single();
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

  function photoErrorMessage(code: string | undefined) {
    if (code === 'both_premium_required') return text.photoBothPremium;
    if (code === 'mutual_cheers_required') return text.photoMutual;
    if (code === 'ai_image_rejected') return text.photoRejectedAi;
    if (code === 'unsafe_image_rejected') return text.photoRejectedUnsafe;
    if (code === 'image_verification_not_configured') return text.photoNotConfigured;
    if (code === 'file_too_large') return text.photoTooLarge;
    if (code === 'unsupported_image_type') return text.photoType;
    return text.photoError;
  }

  async function pickAndSendPhoto() {
    if (!verifiedPhotosEnabled) {
      showAlert(lang === 'de' ? 'Verified Photos sind vorübergehend pausiert.' : lang === 'hr' ? 'Verified Photos su privremeno pauzirane.' : 'Verified Photos are temporarily paused.');
      return;
    }
    if (sendingImage || !conversationId || !conversationVerified || isBlocked) return;
    if (!myPremium) {
      showAlert(text.photoPremium);
      router.push('/premium');
      return;
    }
    if (!otherPremium) {
      showAlert(text.photoBothPremium);
      return;
    }
    if (!mutualCheers) {
      showAlert(text.photoMutual);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const size = Number((asset as any).fileSize || 0);
      if (size > 5 * 1024 * 1024) {
        showAlert(text.photoTooLarge);
        return;
      }
      const mime = asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        showAlert(text.photoType);
        return;
      }

      setSendingImage(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.id !== myUserId) return;
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('image_read_failed');
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
        showAlert(text.photoTooLarge);
        return;
      }

      const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const token = Math.random().toString(36).slice(2, 10);
      const pendingPath = `pending/${session.user.id}/photo-${Date.now()}-${token}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-images').upload(pendingPath, arrayBuffer, {
        contentType: mime,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke('send-chat-image', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { conversationId: String(conversationId), path: pendingPath },
      });
      if (error || !data?.ok) {
        await supabase.storage.from('chat-images').remove([pendingPath]).catch(() => undefined);
        showAlert(photoErrorMessage(data?.error));
        return;
      }

      const sent = data.message as Message;
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
      await loadImageUrl(sent);
      Vibration.vibrate(20);

      void supabase.functions.invoke('send-message-notification', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { messageId: String(sent.id) },
      });
    } catch (error: any) {
      console.log('CHAT PHOTO SEND ERROR:', error?.message ?? error);
      showAlert(text.photoError);
    } finally {
      setSendingImage(false);
    }
  }

  async function reportChatImage(message: Message) {
    if (!otherUserId || message.message_type !== 'image' || message.sender_id === myUserId) return;
    const reason = await chooseOption(
      text.reportPhoto,
      text.reportPhotoConfirm,
      [
        { label: text.reportSexual, value: 'photo_sexual_content', destructive: true },
        { label: text.reportHarassment, value: 'photo_harassment', destructive: true },
        { label: text.reportSpamScam, value: 'photo_spam_scam' },
        { label: text.reportOther, value: 'photo_other' },
      ],
      text.cancel
    );
    if (!reason) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== myUserId) return;

    const { error } = await supabase.from('reports').insert({
      reporter_id: session.user.id,
      reported_id: message.sender_id,
      reason,
      report_kind: 'chat_image',
      reported_message_id: String(message.id),
    });
    if (error) {
      if (error.code === '23505') showAlert(text.reportPhotoDuplicate);
      else if (error.code === 'P0001' && error.message.toLowerCase().includes('rate limit')) showAlert(text.reportLimit);
      else showAlert(`${text.photoError}: ${error.message}`);
      return;
    }
    showAlert(text.reportPhotoSent);
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
        source={{ uri: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&fm=jpg&q=82&w=1800' }}
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
                {item.message_type === 'image' ? (
                  <View>
                    {item.image_moderation_status === 'rejected' ? (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderIcon}>🚫📷</Text>
                        <Text style={styles.imagePlaceholderText}>{text.photoRemoved}</Text>
                      </View>
                    ) : (
                      <>
                        {imageUrls[String(item.id)] ? (
                          <Image
                            source={{ uri: imageUrls[String(item.id)] }}
                            style={styles.messageImage}
                            resizeMode="cover"
                            onError={() => {
                              const id = String(item.id);
                              setImageUrls((current) => {
                                const next = { ...current };
                                delete next[id];
                                return next;
                              });
                              setImageLoadState((current) => ({ ...current, [id]: 'error' }));
                              if (!imageRefreshAttemptRef.current.has(id)) {
                                imageRefreshAttemptRef.current.add(id);
                                void loadImageUrl(item, true);
                              }
                            }}
                          />
                        ) : (
                          <TouchableOpacity style={styles.imagePlaceholder} onPress={() => void loadImageUrl(item)} disabled={imageLoadState[String(item.id)] === 'loading'}>
                            <Text style={styles.imagePlaceholderIcon}>🔒📷</Text>
                            <Text style={styles.imagePlaceholderText}>
                              {imageLoadState[String(item.id)] === 'loading' ? text.photoLoading : text.photoRetry}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <View style={styles.imageFooterRow}>
                          <View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>✓ {text.verifiedPhoto}</Text></View>
                          {!mine && (
                            <TouchableOpacity style={styles.reportImageButton} onPress={() => void reportChatImage(item)}>
                              <Text style={styles.reportImageText}>⚠ {text.reportPhoto}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  <Text style={styles.messageText}>{item.content}</Text>
                )}
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

      {sendingImage && !isBlocked && (
        <View style={styles.photoStatusBar}><Text style={styles.photoStatusText}>🔎 {text.photoVerifying}</Text></View>
      )}

      {isBlocked ? (
        <View style={styles.blockedBar}><Text style={styles.blockedText}>{text.blocked}</Text></View>
      ) : (
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.photoButton, sendingImage && styles.sendButtonDisabled]}
            onPress={pickAndSendPhoto}
            disabled={sendingImage}
            activeOpacity={0.8}
          >
            <Text style={styles.photoButtonText}>{sendingImage ? '…' : (!verifiedPhotosEnabled ? '⏸️' : (myPremium && otherPremium && mutualCheers ? '📷' : '🔒'))}</Text>
          </TouchableOpacity>
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
    opacity: 0.28,
  },
  chatBackdropShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,9,11,0.66)',
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
  photoStatusBar: { paddingHorizontal: 18, paddingVertical: 8, backgroundColor: '#101014', borderTopWidth: 1, borderTopColor: '#27272A' },
  photoStatusText: { color: '#D4D4D8', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  typingText: { color: '#A1A1AA', fontSize: 12, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#2B2224', backgroundColor: '#0B0B0E' },
  photoButton: { width: 46, height: 46, borderRadius: 23, marginRight: 8, backgroundColor: '#151519', borderWidth: 1, borderColor: '#3A2A2D', alignItems: 'center', justifyContent: 'center' },
  photoButtonText: { fontSize: 18 },
  messageImage: { width: 230, height: 230, maxWidth: '100%', borderRadius: 14, backgroundColor: '#0B0B0E' },
  imagePlaceholder: { width: 220, height: 150, borderRadius: 14, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#34343A', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderIcon: { fontSize: 26, marginBottom: 7 },
  imagePlaceholderText: { color: '#A1A1AA', fontSize: 11, fontWeight: '800' },
  imageFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  verifiedBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#102419', borderWidth: 1, borderColor: '#245A38' },
  reportImageButton: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: '#201313', borderWidth: 1, borderColor: '#5A2A2A' },
  reportImageText: { color: '#FCA5A5', fontSize: 9, fontWeight: '800' },
  verifiedBadgeText: { color: '#67DC98', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  input: { flex: 1, minHeight: 50, backgroundColor: '#151519', borderWidth: 1, borderColor: '#34343A', borderRadius: 25, paddingHorizontal: 16, color: '#FFFFFF', fontSize: 15, outlineStyle: 'none' as any },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DC2626', borderWidth: 1, borderColor: '#F87171', alignItems: 'center', justifyContent: 'center', marginLeft: 9, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 9, elevation: 3 },
  sendButtonDisabled: { opacity: 0.35 },
  sendText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  blockedBar: { paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#27272A', backgroundColor: '#18181B' },
  blockedText: { color: '#EF4444', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
});
