import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

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
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
const [profilePhotos, setProfilePhotos] = useState<any[]>([]);
const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
const [profile, setProfile] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [isPremium, setIsPremium] = useState(false);
  const [showMutualCheers, setShowMutualCheers] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
const [reportReason, setReportReason] = useState<string | null>(null);

  const [cheersStatus, setCheersStatus] = useState<
  'none' | 'sent' | 'mutual'
>('none');

  const cheersScale = useRef(new Animated.Value(0)).current;

  const { width, height } = useWindowDimensions();

  // =========================
  // FALLING DRINK EMOJIS
  // =========================

  const drinkEmojis = [
    '🍷',
    '🍸',
    '🍹',
    '🍺',
    '🍻',
    '🥂',
    '🥃',
    '🫗',
  ];

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

  // =========================
  // LOAD PROFILE
  // =========================

  useEffect(() => {
    loadUserProfile();
  }, [id]);
async function checkCheersStatus(targetUserId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return;

  const myId = session.user.id;

  if (myId === targetUserId) {
    setCheersStatus('none');
    return;
  }

  const { data: sentCheers } = await supabase
    .from('cheers')
    .select('id')
    .eq('sender_id', myId)
    .eq('receiver_id', targetUserId)
    .maybeSingle();

  const { data: receivedCheers } = await supabase
    .from('cheers')
    .select('id')
    .eq('sender_id', targetUserId)
    .eq('receiver_id', myId)
    .maybeSingle();

  if (sentCheers && receivedCheers) {
    setCheersStatus('mutual');
  } else if (sentCheers) {
    setCheersStatus('sent');
  } else {
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
      console.log('PROFILE LOAD: no logged user');
      setProfile(null);
      return;
    }

    const targetId =
      typeof id === 'string' && id
        ? id
        : session.user.id;

    console.log('LOADING PROFILE ID:', targetId);


if (session?.user) {
  const { data: myProfile, error: premiumError } =
    await supabase
      .from('profiles')
      .select('is_premium, premium_until')
      .eq('id', session.user.id)
      .maybeSingle();

  if (premiumError) {
    console.log(
      'PREMIUM STATUS ERROR:',
      premiumError.message
    );
  }

  const premiumActive =
    myProfile?.is_premium === true &&
    (!myProfile.premium_until ||
      new Date(myProfile.premium_until) > new Date());

  setIsPremium(premiumActive);

  console.log(
    'USER PROFILE PREMIUM:',
    premiumActive
  );
}
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    console.log('PROFILE DATA:', data);
    console.log(
      'PROFILE ERROR:',
      error?.message ?? 'none'
    );
const { data: photosData, error: photosError } =
  await supabase
    .from('profile_photos')
    .select('id, photo_url, sort_order')
    .eq('user_id', targetId)
    .order('sort_order', { ascending: true });

if (photosError) {
  console.log(
    'USER PROFILE PHOTOS ERROR:',
    photosError.message
  );
} else {
  setProfilePhotos(photosData ?? []);

  console.log(
    'USER PROFILE PHOTOS:',
    photosData ?? []
  );
}
    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);

    if (data?.id) {
      await checkCheersStatus(data.id);
    }

  } finally {
    setLoading(false);
  }
}

// =========================
// CHEERS ANIMATION
// =========================

  // =========================
  // CHEERS ANIMATION
  // =========================

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

  // =========================
  // HANDLE CHEERS
  // =========================

  async function handleCheers() {
    if (!profile) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      if (typeof window !== 'undefined') {
        window.alert('Please log in first');
      }

      router.replace('/login');
      return;
    }

    const senderId = session.user.id;
    const receiverId = profile.id;

    if (senderId === receiverId) {
      if (typeof window !== 'undefined') {
        window.alert("You can't Cheers yourself 😄");
      }

      return;
    }
setCheersStatus('sent');
    console.log('CHEERS SENDER:', senderId);
    console.log('CHEERS RECEIVER:', receiverId);

    // =========================
    // SAVE CHEERS
    // =========================

    const { error: sendError } = await supabase
      .from('cheers')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
      });

    if (sendError) {
      // 23505 = već postoji isti Cheers
      if (sendError.code === '23505') {
        console.log('CHEERS ALREADY SENT');
      } else {
        console.log(
          'CHEERS SEND ERROR:',
          sendError.message
        );

        if (typeof window !== 'undefined') {
          window.alert(
            `Cheers error: ${sendError.message}`
          );
        }

        return;
      }
    } else {
      console.log('CHEERS SAVED');
    }

    // =========================
    // CHECK MUTUAL CHEERS
    // =========================

    const {
      data: mutualCheers,
      error: mutualError,
    } = await supabase
      .from('cheers')
      .select('id')
      .eq('sender_id', receiverId)
      .eq('receiver_id', senderId)
      .maybeSingle();

    if (mutualError) {
      console.log(
        'MUTUAL CHEERS ERROR:',
        mutualError.message
      );

      return;
    }

    // =========================
    // MUTUAL!
    // =========================

    if (mutualCheers) {
      console.log('MUTUAL CHEERS!');
      setCheersStatus('mutual');

      setShowMutualCheers(true);
      playCheersAnimation();

      return;
    }

    // =========================
    // WAITING FOR OTHER USER
    // =========================

    console.log(
      'CHEERS SENT - WAITING FOR OTHER USER'
    );

    if (typeof window !== 'undefined') {
      window.alert(
        `🍻 Cheers sent to ${
          profile.name ?? 'SipMate User'
        }!`
      );
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

  const reporterId = session.user.id;
  const reportedId = profile.id;

  if (reporterId === reportedId) {
    return;
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason: reportReason,
    });

  if (error) {
    console.log('REPORT ERROR:', error.message);

    if (typeof window !== 'undefined') {
      window.alert(
        `Report error: ${error.message}`
      );
    }

    return;
  }

  setShowReportModal(false);
  setReportReason(null);

  if (typeof window !== 'undefined') {
    window.alert(
      'Report submitted. Thank you for helping keep SipMate safe.'
    );
  }
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

  const myId = session.user.id;
  const blockedId = profile.id;

  if (myId === blockedId) {
    return;
  }

  const confirmed =
    typeof window !== 'undefined'
      ? window.confirm(
          `Block ${profile.name ?? 'this user'}?\n\nThey will no longer appear in your Nearby results.`
        )
      : true;

  if (!confirmed) return;

  const { error } = await supabase
    .from('blocks')
    .insert({
      blocker_id: myId,
      blocked_id: blockedId,
    });

  if (error) {
    if (error.code === '23505') {
      if (typeof window !== 'undefined') {
        window.alert('This user is already blocked.');
      }
    } else {
      console.log('BLOCK ERROR:', error.message);

      if (typeof window !== 'undefined') {
        window.alert(
          `Block error: ${error.message}`
        );
      }
    }

    return;
  }

  setShowUserMenu(false);

  if (typeof window !== 'undefined') {
    window.alert(
      `${profile.name ?? 'User'} has been blocked.`
    );
  }

  router.replace('/nearby');
}
  // =========================
  // START CHAT
  // =========================

  async function startChat() {
    if (!profile) return;

    console.log('START CHAT PRESSED');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    const myId = session.user.id;
    const otherId = profile.id;

    if (myId === otherId) {
      return;
    }

    // Uvijek isti poredak usera
    const userOne =
      myId < otherId ? myId : otherId;

    const userTwo =
      myId < otherId ? otherId : myId;

    console.log('CHAT USER ONE:', userOne);
    console.log('CHAT USER TWO:', userTwo);

    // =========================
    // FIND EXISTING CONVERSATION
    // =========================

    const {
      data: existingConversation,
      error: findError,
    } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_one', userOne)
      .eq('user_two', userTwo)
      .maybeSingle();

    if (findError) {
      console.log(
        'CONVERSATION FIND ERROR:',
        findError.message
      );

      return;
    }

    let conversationId =
      existingConversation?.id;

    // =========================
    // CREATE IF NOT EXISTS
    // =========================

    if (!conversationId) {
      const {
        data: newConversation,
        error: createError,
      } = await supabase
        .from('conversations')
        .insert({
          user_one: userOne,
          user_two: userTwo,
        })
        .select('id')
        .single();

      if (createError) {
        console.log(
          'CONVERSATION CREATE ERROR:',
          createError.message
        );

        return;
      }

      conversationId = newConversation.id;
    }

    console.log(
      'GOING TO CHAT:',
      conversationId
    );

    setShowMutualCheers(false);

    router.push({
      pathname: '/chat',
      params: {
        conversationId,
        id: profile.id,
        name:
          profile.name ??
          'SipMate User',
      },
    });
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>
          Loading profile...
        </Text>
      </View>
    );
  }

  // =========================
  // PROFILE NOT FOUND
  // =========================

  if (!profile) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>
          Profile not found.
        </Text>
      </View>
    );
  }

  // =========================
  // PROFILE SCREEN
  // =========================

  return (
    <View style={styles.screen}>
      {/* PROFILE CARD */}
<View style={styles.card}>
  <Pressable
  style={styles.menuButton}
  onPress={() => setShowUserMenu(true)}
>
  <Text style={styles.menuButtonText}>
    •••
  </Text>
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
    <Text style={styles.profileGalleryTitle}>
      📸 PHOTOS
    </Text>

<View style={styles.profileGalleryRow}>
  {profilePhotos.map((photo) => (
<Pressable
  key={photo.id}
  onPress={() => {
    setSelectedPhoto(photo.photo_url);
  }}
  style={{
    width: 150,
    height: 190,
    marginRight: 10,
    zIndex: 20,
  }}
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
    {profile.name ?? 'SipMate User'}
    {profile.age ? `, ${profile.age}` : ''}
  </Text>

  <Text style={styles.city}>
    📍 {profile.city ?? 'Location not set'}
  </Text>

  <View
    style={[
      styles.statusBadge,
      profile.is_active
        ? styles.statusBadgeActive
        : styles.statusBadgeInactive,
    ]}
  >
    <Text
      style={[
        styles.statusBadgeText,
        profile.is_active
          ? styles.statusTextActive
          : styles.statusTextInactive,
      ]}
    >
      {profile.is_active
        ? '● ACTIVE — Ready for a drink'
        : '● INACTIVE'}
    </Text>
  </View>

  <View style={styles.section}>
    <Text style={styles.label}>
      CURRENTLY UP FOR
    </Text>

    <View style={styles.drinkChip}>
      <Text style={styles.drink}>
        {profile.currently_up_for ??
          '🍻 Ready for a drink'}
      </Text>
    </View>
  </View>

  <View style={styles.section}>
    <Text style={styles.label}>
      ABOUT
    </Text>

    <Text style={styles.bio}>
      {profile.bio || 'No bio yet.'}
    </Text>
  </View>

  {cheersStatus === 'mutual' ? (
    <Pressable
      style={styles.primaryButton}
      onPress={startChat}
    >
      <Text style={styles.primaryButtonText}>
        💬 OPEN CHAT
      </Text>
    </Pressable>
  ) : cheersStatus === 'sent' ? (
    <Pressable
      style={[
        styles.primaryButton,
        styles.sentButton,
      ]}
      disabled
    >
      <Text style={styles.primaryButtonText}>
        🍻 CHEERS SENT
      </Text>
    </Pressable>
  ) : (
    <Pressable
      style={styles.primaryButton}
      onPress={handleCheers}
    >
      <Text style={styles.primaryButtonText}>
        🍻 SEND CHEERS
      </Text>
    </Pressable>
  )}
</View>  
<TouchableOpacity
  style={[
    styles.messageButton,
    !isPremium && styles.messageButtonLocked,
  ]}
  onPress={() => {
    if (!isPremium) {
      router.push('/premium');
      return;
    }

    startChat();
  }}
>
  <Text style={styles.messageButtonText}>
    {isPremium ? '💎 MESSAGE' : '🔒 MESSAGE'}
  </Text>
</TouchableOpacity>
<Modal
  visible={showUserMenu}
  transparent
  animationType="fade"
  onRequestClose={() => setShowUserMenu(false)}
>
  <Pressable
    style={styles.menuOverlay}
    onPress={() => setShowUserMenu(false)}
  >
    <View style={styles.menuCard}>
      <Text style={styles.menuTitle}>
        {profile.name ?? 'SipMate User'}
      </Text>

<Pressable
  style={styles.menuOption}
  onPress={() => {
    setShowUserMenu(false);
    setReportReason(null);
    setShowReportModal(true);
  }}
>
  <Text style={styles.reportOptionText}>
    ⚠️ Report user
  </Text>
</Pressable>

      <View style={styles.menuDivider} />

<Pressable
  style={styles.menuOption}
  onPress={handleBlockUser}
>
  <Text style={styles.blockOptionText}>
    🚫 Block user
  </Text>
</Pressable>

      <Pressable
        style={styles.cancelMenuButton}
        onPress={() => setShowUserMenu(false)}
      >
        <Text style={styles.cancelMenuText}>
          Cancel
        </Text>
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
        ⚠️ Report {profile.name ?? 'user'}
      </Text>

      <Text style={styles.reportSubtitle}>
        Why are you reporting this profile?
      </Text>

      {[
        ['inappropriate_behavior', 'Inappropriate behavior'],
        ['harassment', 'Harassment'],
        ['fake_profile', 'Fake profile'],
        ['spam', 'Spam'],
        ['other', 'Other'],
      ].map(([value, label]) => (
        <Pressable
          key={value}
          style={[
            styles.reportReasonButton,
            reportReason === value &&
              styles.reportReasonButtonActive,
          ]}
          onPress={() => setReportReason(value)}
        >
          <Text
            style={[
              styles.reportReasonText,
              reportReason === value &&
                styles.reportReasonTextActive,
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
  <Text style={styles.submitReportButtonText}>
    SUBMIT REPORT
  </Text>
</Pressable>

      <Pressable
        style={styles.cancelMenuButton}
        onPress={() => setShowReportModal(false)}
      >
        <Text style={styles.cancelMenuText}>
          Cancel
        </Text>
      </Pressable>
    </View>
    </View>
</Modal>
      {/* ========================= */}
      {/* MUTUAL CHEERS MODAL */}
      {/* ========================= */}

      <Modal
        visible={showMutualCheers}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMutualCheers(false)
        }
      >
        <View style={styles.cheersOverlay}>
          {/* FALLING EMOJIS */}

          {confetti.map((item, index) => (
            <Animated.Text
              key={item.id}
              style={[
                styles.fallingEmoji,
                {
                  left:
                    item.x *
                    Math.max(
                      width -
                        item.size -
                        20,
                      1
                    ),

                  fontSize: item.size,

                  transform: [
                    {
                      translateY:
                        fallingValues[index],
                    },

                    {
                      rotate:
                        `${item.rotate}deg`,
                    },
                  ],
                },
              ]}
            >
              {item.emoji}
            </Animated.Text>
          ))}

          {/* CHEERS CARD */}

          <Animated.View
            style={[
              styles.cheersPopup,
              {
                transform: [
                  {
                    scale: cheersScale,
                  },
                ],
              },
            ]}
          >
            <Text style={styles.bigCheers}>
              🍻
            </Text>

            <Text style={styles.cheersTitle}>
              CHEERS!
            </Text>

            <Text
              style={styles.cheersSubtitle}
            >
              You and{' '}
              {profile.name ??
                'SipMate User'}{' '}
              are ready for a drink!
            </Text>

            {/* ACTIONS */}

            <View
              style={styles.cheersActions}
            >
              <Pressable
                style={styles.chatButton}
                onPress={startChat}
              >
                <Text
                  style={
                    styles.chatButtonText
                  }
                >
                  💬 START CHAT
                </Text>
              </Pressable>

              <Pressable
                style={styles.browseButton}
                onPress={() => {
                  setShowMutualCheers(
                    false
                  );

                  router.push(
                    '/nearby'
                  );
                }}
              >
                <Text
                  style={
                    styles.browseButtonText
                  }
                >
                  🍻 KEEP BROWSING
                </Text>
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

// =========================
// STYLES
// =========================

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

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
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

  status: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 14,
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
    marginTop: 7,
  },

bio: {
  color: '#E4E4E7',
  fontSize: 14,
  lineHeight: 22,
  marginTop: 8,
},

  cheersButton: {
    width: '100%',
    marginTop: 24,
    backgroundColor: '#A855F7',
    paddingVertical: 17,
    borderRadius: 24,
    alignItems: 'center',
  },

  cheersText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  // =========================
  // CHEERS OVERLAY
  // =========================

  cheersOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.86)',
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
    borderColor: '#A855F7',
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
    color: '#A855F7',
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
    backgroundColor: '#A855F7',
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
  shadowColor: '#DC2626',
shadowOpacity: 0.25,
shadowRadius: 10,
shadowOffset: {
  width: 0,
  height: 4,
},
elevation: 4,
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
  color: '#09090B',
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
profileGalleryImage: {
  width: 150,
  height: 190,
  borderRadius: 18,
  marginRight: 10,
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