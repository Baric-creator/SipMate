import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
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
  is_premium: boolean;
premium_until: string | null;
};

export default function UserProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.log('PROFILE: no logged user');
        setProfile(null);
        return;
      }

      const userId = session.user.id;

      console.log('MY PROFILE USER ID:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('MY PROFILE:', data);
      console.log('MY PROFILE ERROR:', error?.message ?? 'none');

      if (error) {
        setProfile(null);
        return;
      }

      setProfile(data);
    } finally {
      setLoading(false);
    }
  }

  function handleCheers() {
    if (!profile) return;

    if (typeof window !== 'undefined') {
      window.alert(`🍻 Cheers sent to ${profile.name}!`);
    }
  }
async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.log('LOGOUT ERROR:', error.message);
    return;
  }

  router.replace('/login');
}
  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>Profile not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
<View style={styles.card}>
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

<Text style={styles.name}>
  {profile.name ?? 'SipMate User'}
  {profile.age ? `, ${profile.age}` : ''}
</Text>

{profile.is_premium && (
  <View style={styles.premiumBadge}>
    <Text style={styles.premiumBadgeText}>
      💎 PREMIUM
    </Text>
  </View>
)}

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
    ? `● ${t('profileScreen.active')}`
    : `● ${t('profileScreen.inactive')}`}
</Text>
</View>

<View style={styles.section}>
  <Text style={styles.label}>
    {t('profileScreen.currentlyUpFor')}
  </Text>

  <View style={styles.drinkChip}>
    <Text style={styles.drink}>
      {profile.currently_up_for ??
  t('profileScreen.readyForDrink')}
    </Text>
  </View>
</View>

  <View style={styles.section}>
    <Text style={styles.label}>
  {t('profileScreen.about')}
</Text>

    <Text style={styles.bio}>
{profile.bio?.trim()
  ? profile.bio
  : t('profileScreen.noBioYet')}
      </Text>
  </View>
<Pressable
  style={styles.premiumButton}
  onPress={() => router.push('/premium')}
>
  <Text style={styles.premiumButtonText}>
    💎 {t('profileScreen.premium')}
  </Text>
</Pressable>

<Pressable
  style={styles.editButton}
  onPress={() => router.push('/edit-profile')}
>
  <Text style={styles.editButtonText}>
    ✏️ {t('profileScreen.editProfile')}
  </Text>
</Pressable>

<Pressable
  style={styles.blockedUsersButton}
  onPress={() => router.push('/blocked-users')}
>
  <Text style={styles.blockedUsersButtonText}>
    🚫 {t('profileScreen.blockedUsers')}
  </Text>
</Pressable>
<Pressable
  style={styles.languageButton}
  onPress={() => router.push('/language')}
>
  <Text style={styles.languageButtonText}>
    🌍 {t('profileScreen.language')}
  </Text>
</Pressable>
  <Pressable
    style={styles.logoutButton}
    onPress={handleLogout}
  >
    <Text style={styles.logoutText}>
      🚪 {t('profileScreen.logout')}
    </Text>
  </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loading: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#18181B',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
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
    fontSize: 30,
    fontWeight: '900',
    marginTop: 18,
  },

  city: {
    color: '#A1A1AA',
    marginTop: 6,
  },

  status: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 14,
  },

  section: {
    width: '100%',
    backgroundColor: '#27272A',
    padding: 16,
    borderRadius: 18,
    marginTop: 18,
  },

  label: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  drink: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 7,
  },

  bio: {
    color: '#D4D4D8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
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
  blockedUsersButton: {
  width: '100%',
  marginTop: 14,
  backgroundColor: '#27272A',
  borderWidth: 1,
  borderColor: '#DC2626',
  borderRadius: 14,
  paddingVertical: 16,
  alignItems: 'center',
  justifyContent: 'center',
},

blockedUsersButtonText: {
  color: '#EF4444',
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 0.6,
},
languageButton: {
  width: '100%',
  marginTop: 14,
  backgroundColor: '#18181B',
  borderWidth: 1,
  borderColor: '#3F3F46',
  borderRadius: 14,
  paddingVertical: 16,
  alignItems: 'center',
  justifyContent: 'center',
},

languageButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 0.6,
},

  logoutButton: {
  width: '100%',
  marginTop: 24,
  backgroundColor: '#27272A',
  borderWidth: 1,
  borderColor: '#DC2626',
  paddingVertical: 16,
  borderRadius: 22,
  alignItems: 'center',
},

logoutText: {
  color: '#EF4444',
  fontSize: 15,
  fontWeight: '900',
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

editButton: {
  width: '100%',
  marginTop: 24,
  backgroundColor: '#DC2626',
  paddingVertical: 16,
  borderRadius: 22,
  alignItems: 'center',
},

editButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
},
premiumBadge: {
  marginTop: 10,
  backgroundColor: '#F59E0B',
  borderWidth: 1,
  borderColor: '#FBBF24',
  paddingHorizontal: 13,
  paddingVertical: 6,
  borderRadius: 999,
},

premiumBadgeText: {
  color: '#09090B',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 0.8,
},
premiumButton: {
  width: '100%',
  marginTop: 24,
  backgroundColor: '#F59E0B',
  borderWidth: 1,
  borderColor: '#FBBF24',
  paddingVertical: 16,
  borderRadius: 22,
  alignItems: 'center',
},

premiumButtonText: {
  color: '#09090B',
  fontSize: 15,
  fontWeight: '900',
  letterSpacing: 0.5,
},
});