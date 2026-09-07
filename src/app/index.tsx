import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Vibration,
  Linking,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/Skeleton';

type UserProfile = {
  id: string;
  name: string | null;
  city: string | null;
  currently_up_for: string | null;
  is_active: boolean;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.split('-')[0];
  const communityText = language === 'de'
    ? {
        eyebrow: 'SIPMATE COMMUNITY',
        title: 'Find a SipMate',
        body: 'Finde Leute, teile deine Stadt und bleib über WhatsApp mit der Community verbunden.',
        button: 'FIND A SIPMATE ÖFFNEN',
        generalButton: 'GENERAL CHAT ÖFFNEN',
      }
    : language === 'hr'
      ? {
          eyebrow: 'SIPMATE COMMUNITY',
          title: 'Find a SipMate',
          body: 'Pronađi ekipu, napiši svoj grad i poveži se s communityjem direktno na WhatsAppu.',
          button: 'OTVORI FIND A SIPMATE',
          generalButton: 'OTVORI GENERAL CHAT',
        }
      : {
          eyebrow: 'SIPMATE COMMUNITY',
          title: 'Find a SipMate',
          body: 'Meet people, share your city and stay connected with the community directly on WhatsApp.',
          button: 'OPEN FIND A SIPMATE',
          generalButton: 'OPEN GENERAL CHAT',
        };

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [activityCount, setActivityCount] =
    useState(0);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  function translateActivity(
    activity: string | null
  ) {
    if (!activity) {
      return t(
        'discoverScreen.readyForDrink'
      );
    }

    const translations: Record<
      string,
      string
    > = {
      '🍺 Beer': `🍺 ${t(
        'discoverScreen.beer'
      )}`,

      '🍹 Cocktail': `🍹 ${t(
        'discoverScreen.cocktail'
      )}`,

      '🍸 Cocktail': `🍸 ${t(
        'discoverScreen.cocktail'
      )}`,

      '🍷 Wine': `🍷 ${t(
        'discoverScreen.wine'
      )}`,

      '🥃 Whisky': `🥃 ${t(
        'discoverScreen.whisky'
      )}`,

      '☕ Coffee': `☕ ${t(
        'discoverScreen.coffee'
      )}`,

      '🥂 Drinks': `🥂 ${t(
        'discoverScreen.drinks'
      )}`,

      '🎉 Hangout': `🎉 ${t(
        'discoverScreen.hangout'
      )}`,
    };

    return (
      translations[activity] ??
      activity
    );
  }

  async function loadProfile() {
    try {
      setLoading(true);

      const onboardingDone = await AsyncStorage.getItem('sipmate:onboarding:v1');
      if (!onboardingDone) {
        router.replace('/onboarding');
        return;
      }

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data, error } =
        await supabase
          .from('profiles')
          .select(
            'id, name, city, currently_up_for, is_active'
          )
          .eq(
            'id',
            session.user.id
          )
          .maybeSingle();

      if (error) {
        console.log(
          'HOME PROFILE ERROR:',
          error.message
        );
        return;
      }

      if (!data) {
        const fallbackName =
          session.user.user_metadata?.name ??
          session.user.user_metadata?.full_name ??
          session.user.email?.split('@')[0] ??
          'SipMate User';

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            name: fallbackName,
            is_active: false,
            is_premium: false,
          }, { onConflict: 'id' })
          .select('id, name, city, currently_up_for, is_active')
          .single();

        if (createError) {
          console.log('HOME PROFILE CREATE ERROR:', createError.message);
          return;
        }

        setProfile(created);
        await loadActivityCount(session.user.id);
        return;
      }

      setProfile(data);
      await loadActivityCount(session.user.id);
    } finally {
      setLoading(false);
    }
  }

  async function loadActivityCount(myId: string) {
    try {
      const seenAt = await AsyncStorage.getItem('sipmate:activity-seen-at');

      const [{ data: conversations }, cheersResult] = await Promise.all([
        supabase
          .from('conversations')
          .select('id')
          .or(`user_one.eq.${myId},user_two.eq.${myId}`),
        (() => {
          let query = supabase
            .from('cheers')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', myId);

          if (seenAt) query = query.gt('created_at', seenAt);
          return query;
        })(),
      ]);

      const conversationIds = (conversations ?? []).map((item) => item.id);
      let unreadMessages = 0;

      if (conversationIds.length) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .neq('sender_id', myId)
          .is('read_at', null);

        unreadMessages = count ?? 0;
      }

      const cheersCount = cheersResult.count ?? 0;
      setActivityCount(Math.min(99, unreadMessages + cheersCount));
    } catch (error) {
      console.log('ACTIVITY COUNT ERROR:', error);
    }
  }

  async function toggleActive() {
    if (!profile) {
      return;
    }

    const newStatus =
      !profile.is_active;

    const { error } =
      await supabase
        .from('profiles')
        .update({
          is_active: newStatus,
        })
        .eq('id', profile.id);

    if (error) {
      console.log(
        'ACTIVE STATUS ERROR:',
        error.message
      );
      return;
    }

    setProfile({
      ...profile,
      is_active: newStatus,
    });

    Vibration.vibrate(35);

    console.log(
      'ACTIVE STATUS:',
      newStatus
        ? 'ACTIVE'
        : 'INACTIVE'
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingShell}>
          <View style={styles.loadingHeader}>
            <View style={{ flex: 1 }}>
              <Skeleton width="48%" height={24} radius={10} />
              <Skeleton width="34%" height={10} radius={5} style={{ marginTop: 9 }} />
            </View>
            <Skeleton width={72} height={30} radius={15} />
          </View>
          <Skeleton height={220} radius={20} style={{ marginTop: 22 }} />
          <Skeleton height={72} radius={18} style={{ marginTop: 14 }} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <Skeleton height={140} radius={18} style={{ flex: 1 }} />
            <Skeleton height={140} radius={18} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            SipMate 🍻
          </Text>

          <Text
            style={styles.location}
          >
            📍{' '}
            {profile?.city ||
              t(
                'discoverScreen.locationNotSet'
              )}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.activityButton} onPress={() => router.push('/activity')}>
            <Text style={styles.activityIcon}>🔔</Text>
            {activityCount > 0 && (
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeText}>
                  {activityCount > 99 ? '99+' : activityCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
          style={[
            styles.statusBadge,
            profile?.is_active
              ? styles.statusBadgeActive
              : styles.statusBadgeInactive,
          ]}
          onPress={toggleActive}
        >
          <Text
            style={[
              styles.statusText,
              profile?.is_active
                ? styles.statusTextActive
                : styles.statusTextInactive,
            ]}
          >
            {profile?.is_active
              ? `● ${t(
                  'discoverScreen.active'
                )}`
              : `● ${t(
                  'discoverScreen.inactive'
                )}`}
          </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <Text
          style={styles.heroEmoji}
        >
          🍻
        </Text>

        <Text
          style={styles.heroTitle}
        >
          {t(
            'discoverScreen.heroTitle'
          )}
        </Text>

        <Text
          style={styles.heroSubtitle}
        >
          {t(
            'discoverScreen.heroSubtitle'
          )}
        </Text>

        {profile?.currently_up_for && (
          <View
            style={
              styles.currentActivity
            }
          >
            <Text
              style={
                styles.activityLabel
              }
            >
              {t(
                'discoverScreen.currentlyUpFor'
              )}
            </Text>

            <Text
              style={
                styles.activityText
              }
            >
              {translateActivity(
                profile.currently_up_for
              )}
            </Text>
          </View>
        )}

        <Pressable
          style={
            styles.nearbyButton
          }
          onPress={() =>
            router.push('/nearby')
          }
        >
          <Text
            style={
              styles.nearbyButtonText
            }
          >
            🍻{' '}
            {t(
              'discoverScreen.findPeopleNearby'
            )}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.statusCard}
        onPress={toggleActive}
      >
        <View
          style={styles.statusIcon}
        >
          <Text
            style={
              styles.statusIconText
            }
          >
            {profile?.is_active
              ? '●'
              : '○'}
          </Text>
        </View>

        <View
          style={styles.statusInfo}
        >
          <Text
            style={styles.statusTitle}
          >
            {profile?.is_active
              ? t(
                  'discoverScreen.activeTitle'
                )
              : t(
                  'discoverScreen.inactiveTitle'
                )}
          </Text>

          <Text
            style={
              styles.statusDescription
            }
          >
            {profile?.is_active
              ? t(
                  'discoverScreen.activeDescription'
                )
              : t(
                  'discoverScreen.inactiveDescription'
                )}
          </Text>
        </View>
      </Pressable>

      <Text
        style={styles.sectionTitle}
      >
        {t(
          'discoverScreen.quickAccess'
        )}
      </Text>

      <View
        style={styles.quickActions}
      >
        <Pressable
          style={styles.quickCard}
          onPress={() =>
            router.push('/chats')
          }
        >
          <View
            style={
              styles.quickIconBox
            }
          >
            <Text
              style={
                styles.quickIcon
              }
            >
              💬
            </Text>
          </View>

          <Text
            style={
              styles.quickTitle
            }
          >
            {t(
              'discoverScreen.chats'
            )}
          </Text>

          <Text
            style={
              styles.quickDescription
            }
          >
            {t(
              'discoverScreen.chatsDescription'
            )}
          </Text>

          <Text
            style={
              styles.quickArrow
            }
          >
            {t(
              'discoverScreen.open'
            )}
          </Text>
        </Pressable>

        <Pressable
          style={styles.quickCard}
          onPress={() =>
            router.push('/profile')
          }
        >
          <View
            style={
              styles.quickIconBox
            }
          >
            <Text
              style={
                styles.quickIcon
              }
            >
              👤
            </Text>
          </View>

          <Text
            style={
              styles.quickTitle
            }
          >
            {t(
              'discoverScreen.myProfile'
            )}
          </Text>

          <Text
            style={
              styles.quickDescription
            }
          >
            {t(
              'discoverScreen.profileDescription'
            )}
          </Text>

          <Text
            style={
              styles.quickArrow
            }
          >
            {t(
              'discoverScreen.open'
            )}
          </Text>
        </Pressable>
      </View>

      <View style={styles.communityCard}>
        <View style={styles.communityTop}>
          <View style={styles.communityIcon}>
            <Text style={styles.communityIconText}>💬</Text>
          </View>
          <View style={styles.communityCopy}>
            <Text style={styles.communityEyebrow}>{communityText.eyebrow}</Text>
            <Text style={styles.communityTitle}>{communityText.title}</Text>
          </View>
        </View>

        <Text style={styles.communityBody}>{communityText.body}</Text>

        <View style={styles.communityButtons}>
          <Pressable
            style={styles.communityButton}
            onPress={() => Linking.openURL('https://chat.whatsapp.com/LfjUaAs4NBEINuPpU768n0?s=cl&p=a&mlu=4&ilr=4')}
          >
            <Text style={styles.communityButtonText}>
              📍 {communityText.button} ↗
            </Text>
          </Pressable>

          <Pressable
            style={[styles.communityButton, styles.communityButtonSecondary]}
            onPress={() => Linking.openURL('https://chat.whatsapp.com/FIeAP13z4x5H6Ow86E9PYE?s=cl&p=a&mlu=4&ilr=4')}
          >
            <Text style={styles.communityButtonText}>
              💬 {communityText.generalButton} ↗
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={styles.cheersCard}
      >
        <Text
          style={styles.cheersEmoji}
        >
          🍻
        </Text>

        <View
          style={styles.cheersContent}
        >
          <Text
            style={
              styles.cheersTitle
            }
          >
            {t(
              'discoverScreen.sendCheers'
            )}
          </Text>

          <Text
            style={
              styles.cheersDescription
            }
          >
            {t(
              'discoverScreen.cheersDescription'
            )}
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        {t(
          'discoverScreen.footer'
        )}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },

  screenContent: {
    paddingTop: 42,
    paddingHorizontal: 20,
    paddingBottom: 150,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  loadingShell: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 42,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  loadingText: {
    color: '#A1A1AA',
    marginTop: 14,
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activityIcon: {
    fontSize: 16,
  },
  activityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#09090B',
  },
  activityBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  location: {
    color: '#71717A',
    fontSize: 13,
    marginTop: 5,
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
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

  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  statusTextActive: {
    color: '#4ADE80',
  },

  statusTextInactive: {
    color: '#A1A1AA',
  },

  hero: {
    marginTop: 22,
    backgroundColor: '#141417',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: '#242428',
  },

  heroEmoji: {
    fontSize: 38,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 13,
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    color: '#A1A1AA',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
    maxWidth: 400,
  },

  currentActivity: {
    marginTop: 21,
    backgroundColor: '#101012',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2F2F35',
  },

  activityLabel: {
    color: '#71717A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  activityText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },

  nearbyButton: {
    marginTop: 22,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',

    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },

  nearbyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  statusCard: {
    marginTop: 15,
    backgroundColor: '#141417',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#202023',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  statusIconText: {
    color: '#22C55E',
    fontSize: 18,
  },

  statusInfo: {
    flex: 1,
  },

  statusTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  statusDescription: {
    color: '#71717A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  sectionTitle: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 27,
    marginBottom: 11,
  },

  quickActions: {
    flexDirection: 'row',
  },

  quickCard: {
    flex: 1,
    backgroundColor: '#141417',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    marginRight: 8,
    minHeight: 140,
  },

  quickIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickIcon: {
    fontSize: 20,
  },

  quickTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 13,
  },

  quickDescription: {
    color: '#71717A',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    flex: 1,
  },

  quickArrow: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 10,
  },

  communityCard: {
    marginTop: 18,
    backgroundColor: '#101812',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F4D2A',
  },
  communityTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#163D22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  communityIconText: {
    fontSize: 18,
  },
  communityCopy: {
    flex: 1,
  },
  communityEyebrow: {
    color: '#4ADE80',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  communityTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  communityBody: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  communityButtons: {
    gap: 9,
    marginTop: 14,
  },
  communityButton: {
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityButtonSecondary: {
    backgroundColor: '#1E8E4A',
  },
  communityButtonText: {
    color: '#07160D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  cheersCard: {
    marginTop: 16,
    backgroundColor: '#141417',
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: '#3A2020',
    flexDirection: 'row',
    alignItems: 'center',
  },

  cheersEmoji: {
    fontSize: 35,
    marginRight: 14,
  },

  cheersContent: {
    flex: 1,
  },

  cheersTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  cheersDescription: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  footer: {
    color: '#52525B',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 22,
  },
});