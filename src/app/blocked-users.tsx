import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { supabase } from '../lib/supabase';

type BlockedProfile = {
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  avatar_url: string | null;
};

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [blockedUsers, setBlockedUsers] =
    useState<BlockedProfile[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadIdRef = useRef(0);
  const unblockingRef = useRef(new Set<string>());

  useFocusEffect(
    useCallback(() => {
      void loadBlockedUsers();
      return () => {
        loadIdRef.current += 1;
      };
    }, [])
  );

  async function loadBlockedUsers() {
    const requestId = ++loadIdRef.current;

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (requestId !== loadIdRef.current) return;

      if (!session?.user) {
        setBlockedUsers([]);
        router.replace('/login');
        return;
      }

      const myId = session.user.id;

      const {
        data: blocks,
        error: blocksError,
      } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', myId);

      if (requestId !== loadIdRef.current) return;
      const { data: { session: sessionAfterBlocks } } = await supabase.auth.getSession();
      if (sessionAfterBlocks?.user?.id !== myId) return;

      if (blocksError) {
        console.log(
          'BLOCKED USERS ERROR:',
          blocksError.message
        );
        return;
      }

      const blockedIds = (blocks ?? []).map(
        (block) => block.blocked_id
      );

      if (blockedIds.length === 0) {
        setBlockedUsers([]);
        return;
      }

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select(
          'id, name, age, city, avatar_url'
        )
        .in('id', blockedIds);

      if (requestId !== loadIdRef.current) return;
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (finalSession?.user?.id !== myId) return;

      if (profilesError) {
        console.log(
          'BLOCKED PROFILES ERROR:',
          profilesError.message
        );
        return;
      }

      setBlockedUsers((profiles ?? []) as BlockedProfile[]);
    } catch (error) {
      console.log(
        'LOAD BLOCKED USERS ERROR:',
        error
      );
    } finally {
      if (requestId === loadIdRef.current) setLoading(false);
    }
  }

  async function unblockUser(userId: string) {
    if (unblockingRef.current.has(userId)) return;
    unblockingRef.current.add(userId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const expectedUserId = session.user.id;
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq(
          'blocker_id',
          expectedUserId
        )
        .eq(
          'blocked_id',
          userId
        );

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user?.id !== expectedUserId) return;

      if (error) {
        console.log(
          'UNBLOCK ERROR:',
          error.message
        );
        return;
      }

      setBlockedUsers((current) =>
        current.filter(
          (user) => user.id !== userId
        )
      );
    } catch (error) {
      console.log(
        'UNBLOCK USER ERROR:',
        error
      );
    } finally {
      unblockingRef.current.delete(userId);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.titleEmoji}>🚫</Text>
          <Text style={styles.title}>{t('blockedUsers.title')}</Text>
        </View>

        <Text style={styles.subtitle}>
          {t('blockedUsers.subtitle')}
        </Text>

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {t('blockedUsers.loading')}
            </Text>
          </View>
        ) : blockedUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {t(
                'blockedUsers.emptyTitle'
              )}
            </Text>

            <Text style={styles.emptyText}>
              {t(
                'blockedUsers.emptyText'
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {blockedUsers.map((user) => (
              <View
                key={user.id}
                style={styles.userCard}
              >
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {(user.name ?? 'S').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View
                  style={styles.userInfo}
                >
                  <Text
                    style={styles.userName}
                  >
                    {user.name ??
                      'SipMate User'}
                    {user.age
                      ? `, ${user.age}`
                      : ''}
                  </Text>

                  <Text
                    style={styles.userCity}
                  >
                    📍{' '}
                    {user.city ??
                      t(
                        'blockedUsers.locationNotSet'
                      )}
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.unblockButton
                  }
                  onPress={() =>
                    unblockUser(user.id)
                  }
                >
                  <Text
                    style={
                      styles.unblockButtonText
                    }
                  >
                    {t(
                      'blockedUsers.unblock'
                    )}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text
            style={styles.backButtonText}
          >
            ← {t('blockedUsers.back')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    alignItems: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 760,
    paddingHorizontal: 24,
    paddingTop: 34,
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleEmoji: { fontSize: 24 },
  title: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: '#A1A1AA',
    fontSize: 14,
    marginBottom: 28,
  },

  emptyCard: {
    width: '100%',
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#242428',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },

  emptyText: {
    color: '#71717A',
    fontSize: 13,
    textAlign: 'center',
  },

  list: {
    width: '100%',
    gap: 12,
  },

  userCard: {
    width: '100%',
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#242428',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: '#202024',
  },

  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: '#211315',
    borderWidth: 1,
    borderColor: '#3A2020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  userInfo: {
    flex: 1,
    marginRight: 16,
  },

  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },

  userCity: {
    color: '#A1A1AA',
    fontSize: 13,
  },

  unblockButton: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  unblockButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  backButton: {
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});