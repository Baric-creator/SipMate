import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { getCheersRelationship, getProfilePhotos, getPublicProfile } from '../lib/privacy-profile-api';
import { supabase } from '../lib/supabase';

type CheersStatus = 'none' | 'sent' | 'mutual';

type UserProfile = {
  avatar_url: string | null;
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  currently_up_for: string | null;
  is_active: boolean | null;
};

type ProfilePhoto = {
  id: string;
  photo_url: string;
  sort_order: number | null;
};

const copy = {
  en: {
    loginFirst: 'Please log in first',
    cantCheersSelf: "You can't Cheers yourself 😄",
    cheersError: 'Cheers error',
    cheersSentTo: 'Cheers sent to',
    reportError: 'Report error',
    reportThanks: 'Report submitted. Thank you for helping keep SipMate safe.',
    block: 'Block',
    thisUser: 'this user',
    blockDescription: 'They will no longer appear in your Nearby results.',
    alreadyBlocked: 'This user is already blocked.',
    blockError: 'Block error',
    blocked: 'has been blocked.',
    user: 'User',
    loading: 'Loading profile...',
    notFound: 'Profile not found.',
    photos: 'PHOTOS',
    userFallback: 'SipMate User',
    locationNotSet: 'Location not set',
    active: '● ACTIVE — Ready for a drink',
    inactive: '● INACTIVE',
    currentlyUpFor: 'CURRENTLY UP FOR',
    readyForDrink: '🍻 Ready for a drink',
    about: 'ABOUT',
    noBio: 'No bio yet.',
    openChat: 'OPEN CHAT',
    cheersSent: 'CHEERS SENT',
    sendCheers: 'SEND CHEERS',
    message: 'MESSAGE',
    reportUser: 'Report user',
    blockUser: 'Block user',
    cancel: 'Cancel',
    report: 'Report',
    reportWhy: 'Why are you reporting this profile?',
    inappropriate: 'Inappropriate behavior',
    harassment: 'Harassment',
    fakeProfile: 'Fake profile',
    spam: 'Spam',
    other: 'Other',
    submitReport: 'SUBMIT REPORT',
    mutualSubtitleStart: 'You and',
    mutualSubtitleEnd: 'are ready for a drink!',
    startChat: 'START CHAT',
    keepBrowsing: 'KEEP BROWSING',
    beer: 'Beer',
    cocktail: 'Cocktail',
    wine: 'Wine',
    whisky: 'Whisky',
    coffee: 'Coffee',
    drinks: 'Drinks',
    hangout: 'Hangout',
  },
  de: {
    loginFirst: 'Bitte melde dich zuerst an',
    cantCheersSelf: 'Du kannst dir nicht selbst Cheers senden 😄',
    cheersError: 'Cheers-Fehler',
    cheersSentTo: 'Cheers gesendet an',
    reportError: 'Melde-Fehler',
    reportThanks: 'Meldung gesendet. Danke, dass du hilfst, SipMate sicher zu halten.',
    block: 'Blockieren',
    thisUser: 'diesen Nutzer',
    blockDescription: 'Die Person erscheint nicht mehr in deinen Nearby-Ergebnissen.',
    alreadyBlocked: 'Dieser Nutzer ist bereits blockiert.',
    blockError: 'Blockierungsfehler',
    blocked: 'wurde blockiert.',
    user: 'Nutzer',
    loading: 'Profil wird geladen...',
    notFound: 'Profil nicht gefunden.',
    photos: 'FOTOS',
    userFallback: 'SipMate-Nutzer',
    locationNotSet: 'Standort nicht festgelegt',
    active: '● AKTIV — Bereit für einen Drink',
    inactive: '● INAKTIV',
    currentlyUpFor: 'DERZEIT LUST AUF',
    readyForDrink: '🍻 Bereit für einen Drink',
    about: 'ÜBER MICH',
    noBio: 'Noch keine Beschreibung.',
    openChat: 'CHAT ÖFFNEN',
    cheersSent: 'CHEERS GESENDET',
    sendCheers: 'CHEERS SENDEN',
    message: 'NACHRICHT',
    reportUser: 'Nutzer melden',
    blockUser: 'Nutzer blockieren',
    cancel: 'Abbrechen',
    report: 'Melden',
    reportWhy: 'Warum möchtest du dieses Profil melden?',
    inappropriate: 'Unangemessenes Verhalten',
    harassment: 'Belästigung',
    fakeProfile: 'Fake-Profil',
    spam: 'Spam',
    other: 'Sonstiges',
    submitReport: 'MELDUNG SENDEN',
    mutualSubtitleStart: 'Du und',
    mutualSubtitleEnd: 'seid bereit für einen Drink!',
    startChat: 'CHAT STARTEN',
    keepBrowsing: 'WEITER SUCHEN',
    beer: 'Bier',
    cocktail: 'Cocktail',
    wine: 'Wein',
    whisky: 'Whisky',
    coffee: 'Kaffee',
    drinks: 'Drinks',
    hangout: 'Treffen',
  },
  hr: {
    loginFirst: 'Prvo se prijavi',
    cantCheersSelf: 'Ne možeš poslati Cheers sam sebi 😄',
    cheersError: 'Cheers greška',
    cheersSentTo: 'Cheers poslan korisniku',
    reportError: 'Greška prijave',
    reportThanks: 'Prijava je poslana. Hvala što pomažeš da SipMate bude siguran.',
    block: 'Blokirati',
    thisUser: 'ovog korisnika',
    blockDescription: 'Više se neće pojavljivati u tvojim Nearby rezultatima.',
    alreadyBlocked: 'Ovaj korisnik je već blokiran.',
    blockError: 'Greška blokiranja',
    blocked: 'je blokiran.',
    user: 'Korisnik',
    loading: 'Učitavanje profila...',
    notFound: 'Profil nije pronađen.',
    photos: 'FOTOGRAFIJE',
    userFallback: 'SipMate korisnik',
    locationNotSet: 'Lokacija nije postavljena',
    active: '● AKTIVAN — Spreman za piće',
    inactive: '● NEAKTIVAN',
    currentlyUpFor: 'TRENUTNO ZA',
    readyForDrink: '🍻 Spreman za piće',
    about: 'O MENI',
    noBio: 'Još nema opisa.',
    openChat: 'OTVORI CHAT',
    cheersSent: 'CHEERS POSLAN',
    sendCheers: 'POŠALJI CHEERS',
    message: 'PORUKA',
    reportUser: 'Prijavi korisnika',
    blockUser: 'Blokiraj korisnika',
    cancel: 'Odustani',
    report: 'Prijavi',
    reportWhy: 'Zašto prijavljuješ ovaj profil?',
    inappropriate: 'Neprimjereno ponašanje',
    harassment: 'Uznemiravanje',
    fakeProfile: 'Lažni profil',
    spam: 'Spam',
    other: 'Ostalo',
    submitReport: 'POŠALJI PRIJAVU',
    mutualSubtitleStart: 'Ti i',
    mutualSubtitleEnd: 'spremni ste za piće!',
    startChat: 'POKRENI CHAT',
    keepBrowsing: 'NASTAVI TRAŽITI',
    beer: 'Pivo',
    cocktail: 'Koktel',
    wine: 'Vino',
    whisky: 'Viski',
    coffee: 'Kava',
    drinks: 'Piće',
    hangout: 'Druženje',
  },
} as const;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showMutualCheers, setShowMutualCheers] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [cheersStatus, setCheersStatus] = useState<CheersStatus>('none');

  const cheersScale = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();

  const drinkEmojis = ['🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🫗'];

  const confetti = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        emoji: drinkEmojis[index % drinkEmojis.length],
        x: Math.random(),
        duration: 1800 + Math.random() * 1800,
        delay: Math.random() * 500,
        size: 24 + Math.random() * 16,
        rotate: -180 + Math.random() * 360,
      })),
    []
  );

  const fallingValues = useRef(
    confetti.map(() => new Animated.Value(-120))
  ).current;

  useEffect(() => {
    loadUserProfile();
  }, [id]);

  function localizeCurrentUpFor(value: string | null) {
    if (!value) return text.readyForDrink;

    const normalized = value.toLowerCase();
    if (normalized.includes('beer') || normalized.includes('pivo') || normalized.includes('bier')) {
      return value.replace(/beer|pivo|bier/i, text.beer);
    }
    if (normalized.includes('cocktail') || normalized.includes('koktel')) {
      return value.replace(/cocktail|koktel/i, text.cocktail);
    }
    if (normalized.includes('wine') || normalized.includes('vino') || normalized.includes('wein')) {
      return value.replace(/wine|vino|wein/i, text.wine);
    }
    if (normalized.includes('whisky') || normalized.includes('whiskey') || normalized.includes('viski')) {
      return value.replace(/whisky|whiskey|viski/i, text.whisky);
    }
    if (normalized.includes('coffee') || normalized.includes('kava') || normalized.includes('kaffee')) {
      return value.replace(/coffee|kava|kaffee/i, text.coffee);
    }
    if (normalized.includes('hangout') || normalized.includes('družen') || normalized.includes('treffen')) {
      return value.replace(/hangout|druženje|treffen/i, text.hangout);
    }
    if (normalized.includes('drinks') || normalized.includes('piće')) {
      return value.replace(/drinks|piće/i, text.drinks);
    }

    return value;
  }

  async function checkCheersStatus(targetUserId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    if (session.user.id === targetUserId) {
      setCheersStatus('none');
      return;
    }

    try {
      setCheersStatus(await getCheersRelationship(targetUserId));
    } catch (error) {
      console.log('CHEERS STATUS ERROR:', error);
      setCheersStatus('none');
    }
  }

  async function loadUserProfile() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setProfile(null);
        return;
      }

      const targetId = typeof id === 'string' && id ? id : session.user.id;

      const { data: myProfile, error: premiumError } = await supabase
        .from('profiles')
        .select('is_premium, premium_until')
        .eq('id', session.user.id)
        .maybeSingle();

      if (premiumError) {
        console.log('PREMIUM STATUS ERROR:', premiumError.message);
      }

      const premiumActive =
        myProfile?.is_premium === true &&
        (!myProfile.premium_until ||
          new Date(myProfile.premium_until) > new Date());
      setIsPremium(premiumActive);

      try {
        const [data, photosData] = await Promise.all([
          getPublicProfile(targetId),
          getProfilePhotos(targetId),
        ]);

        setProfilePhotos(photosData as ProfilePhoto[]);
        setProfile(data as UserProfile | null);
        if (data?.id) await checkCheersStatus(data.id);
      } catch (profileError) {
        console.log('PROFILE LOAD ERROR:', profileError);
        setProfile(null);
        setProfilePhotos([]);
      }
    } finally {
      setLoading(false);
    }
  }

  function playCheersAnimation() {
    cheersScale.setValue(0);

    Animated.spring(cheersScale, {
      toValue: 1,
      friction: 5,
      tension: 70,
      useNativeDriver: true,
    }).start();

    fallingValues.forEach((value, index) => {
      value.setValue(-120);
      Animated.sequence([
        Animated.delay(confetti[index].delay),
        Animated.timing(value, {
          toValue: height + 150,
          duration: confetti[index].duration,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  async function handleCheers() {
    if (!profile) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      if (typeof window !== 'undefined') window.alert(text.loginFirst);
      router.replace('/login');
      return;
    }

    const senderId = session.user.id;
    const receiverId = profile.id;

    if (senderId === receiverId) {
      if (typeof window !== 'undefined') window.alert(text.cantCheersSelf);
      return;
    }

    setCheersStatus('sent');

    const { error: sendError } = await supabase.from('cheers').insert({
      sender_id: senderId,
      receiver_id: receiverId,
    });

    if (sendError && sendError.code !== '23505') {
      console.log('CHEERS SEND ERROR:', sendError.message);
      if (typeof window !== 'undefined') {
        window.alert(`${text.cheersError}: ${sendError.message}`);
      }
      setCheersStatus('none');
      return;
    }

    try {
      const relationship = await getCheersRelationship(receiverId);
      if (relationship === 'mutual') {
        setCheersStatus('mutual');
        setShowMutualCheers(true);
        playCheersAnimation();
        return;
      }
      setCheersStatus('sent');
    } catch (relationshipError) {
      console.log('MUTUAL CHEERS ERROR:', relationshipError);
      return;
    }

    if (typeof window !== 'undefined') {
      window.alert(`🍻 ${text.cheersSentTo} ${profile.name ?? text.userFallback}!`);
    }
  }

  async function handleSubmitReport() {
    if (!profile || !reportReason) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    if (session.user.id === profile.id) return;

    const { error } = await supabase.from('reports').insert({
      reporter_id: session.user.id,
      reported_id: profile.id,
      reason: reportReason,
    });

    if (error) {
      console.log('REPORT ERROR:', error.message);
      if (typeof window !== 'undefined') {
        window.alert(`${text.reportError}: ${error.message}`);
      }
      return;
    }

    setShowReportModal(false);
    setReportReason(null);
    if (typeof window !== 'undefined') window.alert(text.reportThanks);
  }

  async function handleBlockUser() {
    if (!profile) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    if (session.user.id === profile.id) return;

    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            `${text.block} ${profile.name ?? text.thisUser}?\n\n${text.blockDescription}`
          )
        : true;

    if (!confirmed) return;

    const { error } = await supabase.from('blocks').insert({
      blocker_id: session.user.id,
      blocked_id: profile.id,
    });

    if (error) {
      if (error.code === '23505') {
        if (typeof window !== 'undefined') window.alert(text.alreadyBlocked);
      } else {
        console.log('BLOCK ERROR:', error.message);
        if (typeof window !== 'undefined') {
          window.alert(`${text.blockError}: ${error.message}`);
        }
      }
      return;
    }

    setShowUserMenu(false);
    if (typeof window !== 'undefined') {
      window.alert(`${profile.name ?? text.user} ${text.blocked}`);
    }
    router.replace('/nearby');
  }

  async function startChat() {
    if (!profile) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    const myId = session.user.id;
    const otherId = profile.id;
    if (myId === otherId) return;

    const userOne = myId < otherId ? myId : otherId;
    const userTwo = myId < otherId ? otherId : myId;

    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_one', userOne)
      .eq('user_two', userTwo)
      .maybeSingle();

    if (findError) {
      console.log('CONVERSATION FIND ERROR:', findError.message);
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
        console.log('CONVERSATION CREATE ERROR:', createError.message);
        return;
      }

      conversationId = newConversation.id;
    }

    setShowMutualCheers(false);
    router.push({
      pathname: '/chat',
      params: {
        conversationId,
        id: profile.id,
        name: profile.name ?? text.userFallback,
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>{text.loading}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>{text.notFound}</Text>
      </View>
    );
  }

  const reportReasons = [
    ['inappropriate_behavior', text.inappropriate],
    ['harassment', text.harassment],
    ['fake_profile', text.fakeProfile],
    ['spam', text.spam],
    ['other', text.other],
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Pressable style={styles.menuButton} onPress={() => setShowUserMenu(true)}>
          <Text style={styles.menuButtonText}>•••</Text>
        </Pressable>

        {profile.avatar_url ? (
          <Image
            source={{
              uri: `${profile.avatar_url}${
                profile.avatar_url.includes('?') ? '&' : '?'
              }refresh=${Date.now()}`,
            }}
            style={styles.profileAvatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.profileAvatarFallback}>
            <Text style={styles.profileAvatarFallbackText}>
              {profile.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}

        {profilePhotos.length > 0 && (
          <View style={styles.profileGallerySection}>
            <Text style={styles.profileGalleryTitle}>📸 {text.photos}</Text>
            <View style={styles.profileGalleryRow}>
              {profilePhotos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setSelectedPhoto(photo.photo_url)}
                  style={styles.photoPressable}
                >
                  <Image
                    source={{ uri: photo.photo_url }}
                    style={styles.profileGalleryImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.name}>
          {profile.name ?? text.userFallback}
          {profile.age ? `, ${profile.age}` : ''}
        </Text>

        <Text style={styles.city}>📍 {profile.city ?? text.locationNotSet}</Text>

        <View
          style={[
            styles.statusBadge,
            profile.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              profile.is_active ? styles.statusTextActive : styles.statusTextInactive,
            ]}
          >
            {profile.is_active ? text.active : text.inactive}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{text.currentlyUpFor}</Text>
          <View style={styles.drinkChip}>
            <Text style={styles.drink}>{localizeCurrentUpFor(profile.currently_up_for)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{text.about}</Text>
          <Text style={styles.bio}>{profile.bio || text.noBio}</Text>
        </View>

        {cheersStatus === 'mutual' ? (
          <Pressable style={styles.primaryButton} onPress={startChat}>
            <Text style={styles.primaryButtonText}>💬 {text.openChat}</Text>
          </Pressable>
        ) : cheersStatus === 'sent' ? (
          <Pressable style={[styles.primaryButton, styles.sentButton]} disabled>
            <Text style={styles.primaryButtonText}>🍻 {text.cheersSent}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={handleCheers}>
            <Text style={styles.primaryButtonText}>🍻 {text.sendCheers}</Text>
          </Pressable>
        )}
      </View>

      <TouchableOpacity
        style={[styles.messageButton, !isPremium && styles.messageButtonLocked]}
        onPress={() => {
          if (!isPremium) {
            router.push('/premium');
            return;
          }
          startChat();
        }}
      >
        <Text style={styles.messageButtonText}>
          {isPremium ? `💎 ${text.message}` : `🔒 ${text.message}`}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowUserMenu(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{profile.name ?? text.userFallback}</Text>

            <Pressable
              style={styles.menuOption}
              onPress={() => {
                setShowUserMenu(false);
                setReportReason(null);
                setShowReportModal(true);
              }}
            >
              <Text style={styles.reportOptionText}>⚠️ {text.reportUser}</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuOption} onPress={handleBlockUser}>
              <Text style={styles.blockOptionText}>🚫 {text.blockUser}</Text>
            </Pressable>

            <Pressable style={styles.cancelMenuButton} onPress={() => setShowUserMenu(false)}>
              <Text style={styles.cancelMenuText}>{text.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.menuOverlay}>
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>
              ⚠️ {text.report} {profile.name ?? text.user}
            </Text>
            <Text style={styles.reportSubtitle}>{text.reportWhy}</Text>

            {reportReasons.map(([value, label]) => (
              <Pressable
                key={value}
                style={[
                  styles.reportReasonButton,
                  reportReason === value && styles.reportReasonButtonActive,
                ]}
                onPress={() => setReportReason(value)}
              >
                <Text
                  style={[
                    styles.reportReasonText,
                    reportReason === value && styles.reportReasonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              style={[
                styles.submitReportButton,
                !reportReason && styles.reportButtonDisabled,
              ]}
              disabled={!reportReason}
              onPress={handleSubmitReport}
            >
              <Text style={styles.submitReportButtonText}>{text.submitReport}</Text>
            </Pressable>

            <Pressable
              style={styles.cancelMenuButton}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={styles.cancelMenuText}>{text.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMutualCheers}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMutualCheers(false)}
      >
        <View style={styles.cheersOverlay}>
          {confetti.map((item, index) => (
            <Animated.Text
              key={item.id}
              style={[
                styles.fallingEmoji,
                {
                  left: item.x * Math.max(width - item.size - 20, 1),
                  fontSize: item.size,
                  transform: [
                    { translateY: fallingValues[index] },
                    { rotate: `${item.rotate}deg` },
                  ],
                },
              ]}
            >
              {item.emoji}
            </Animated.Text>
          ))}

          <Animated.View
            style={[
              styles.cheersPopup,
              { transform: [{ scale: cheersScale }] },
            ]}
          >
            <Text style={styles.bigCheers}>🍻</Text>
            <Text style={styles.cheersTitle}>CHEERS!</Text>
            <Text style={styles.cheersSubtitle}>
              {text.mutualSubtitleStart} {profile.name ?? text.userFallback}{' '}
              {text.mutualSubtitleEnd}
            </Text>

            <View style={styles.cheersActions}>
              <Pressable style={styles.chatButton} onPress={startChat}>
                <Text style={styles.chatButtonText}>💬 {text.startChat}</Text>
              </Pressable>

              <Pressable
                style={styles.browseButton}
                onPress={() => {
                  setShowMutualCheers(false);
                  router.push('/nearby');
                }}
              >
                <Text style={styles.browseButtonText}>🍻 {text.keepBrowsing}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoModal}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Text style={styles.photoModalCloseText}>✕</Text>
          </TouchableOpacity>

          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.fullscreenPhoto}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loading: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#18181B',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  city: {
    color: '#A1A1AA',
    marginTop: 7,
    fontSize: 13,
  },
  section: {
    width: '100%',
    backgroundColor: '#202023',
    padding: 16,
    borderRadius: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#2F2F35',
  },
  label: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  drink: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  bio: {
    color: '#E4E4E7',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  cheersOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallingEmoji: {
    position: 'absolute',
    top: -120,
    zIndex: 5,
  },
  cheersPopup: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#18181B',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 34,
    alignItems: 'center',
    zIndex: 20,
  },
  bigCheers: {
    fontSize: 78,
  },
  cheersTitle: {
    color: '#EF4444',
    fontSize: 44,
    fontWeight: '900',
    marginTop: 14,
  },
  cheersSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 23,
  },
  cheersActions: {
    width: '100%',
    marginTop: 28,
  },
  chatButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  browseButton: {
    width: '100%',
    backgroundColor: '#27272A',
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: 'center',
    marginTop: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  profileAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: 'center',
    marginBottom: 18,
    backgroundColor: '#27272A',
    borderWidth: 3,
    borderColor: '#DC2626',
  },
  profileAvatarFallback: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: 'center',
    marginBottom: 18,
    backgroundColor: '#450A0A',
    borderWidth: 3,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
  },
  statusBadge: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#052E16',
    borderColor: '#22C55E',
  },
  statusBadgeInactive: {
    backgroundColor: '#27272A',
    borderColor: '#52525B',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusTextActive: {
    color: '#4ADE80',
  },
  statusTextInactive: {
    color: '#A1A1AA',
  },
  drinkChip: {
    marginTop: 10,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    width: '100%',
    marginTop: 24,
    backgroundColor: '#DC2626',
    paddingVertical: 17,
    borderRadius: 22,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  sentButton: {
    opacity: 0.55,
  },
  menuButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  menuButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: -5,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 26,
    padding: 20,
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
  },
  menuOption: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  reportOptionText: {
    color: '#FBBF24',
    fontSize: 15,
    fontWeight: '800',
  },
  blockOptionText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '900',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#27272A',
  },
  cancelMenuButton: {
    width: '100%',
    backgroundColor: '#27272A',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelMenuText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '800',
  },
  reportCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#18181B',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 22,
  },
  reportTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  reportSubtitle: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  reportReasonButton: {
    width: '100%',
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginBottom: 9,
  },
  reportReasonButtonActive: {
    backgroundColor: '#450A0A',
    borderColor: '#DC2626',
  },
  reportReasonText: {
    color: '#D4D4D8',
    fontSize: 14,
    fontWeight: '700',
  },
  reportReasonTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  submitReportButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  reportButtonDisabled: {
    opacity: 0.4,
  },
  submitReportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  messageButton: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  messageButtonLocked: {
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  profileGallerySection: {
    width: '100%',
    marginTop: 18,
  },
  profileGalleryTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
  },
  profileGalleryRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingRight: 12,
  },
  photoPressable: {
    width: 150,
    height: 190,
    marginRight: 10,
    zIndex: 20,
  },
  profileGalleryImage: {
    width: 150,
    height: 190,
    borderRadius: 18,
    backgroundColor: '#27272A',
  },
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenPhoto: {
    width: '95%',
    height: '85%',
  },
  photoModalClose: {
    position: 'absolute',
    top: 30,
    right: 25,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  photoModalCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
});