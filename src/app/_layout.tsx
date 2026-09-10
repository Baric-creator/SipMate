import * as Notifications from 'expo-notifications';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import '../lib/i18n';
import { clearPresence, touchPresence } from '../lib/presence';
import { registerForPushNotificationsAsync } from '../lib/push-notifications';
import { supabase } from '../lib/supabase';

const hiddenTabBar = { display: 'none' as const };

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          minWidth: 40,
          height: 31,
          paddingHorizontal: 9,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? 'rgba(76,24,28,0.72)' : 'transparent',
          borderWidth: 1,
          borderColor: focused ? 'rgba(248,113,113,0.38)' : 'transparent',
          shadowColor: focused ? '#EF4444' : '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: focused ? 0.20 : 0,
          shadowRadius: focused ? 10 : 0,
          elevation: focused ? 3 : 0,
        }}
      >
        <Text
          style={{
            fontSize: 19,
            opacity: focused ? 1 : 0.58,
            transform: [{ scale: focused ? 1.08 : 1 }],
          }}
        >
          {icon}
        </Text>
      </View>
      <View
        style={{
          width: focused ? 12 : 4,
          height: 2,
          borderRadius: 1,
          marginTop: 3,
          backgroundColor: focused ? '#EF4444' : 'rgba(255,255,255,0.08)',
          shadowColor: '#EF4444',
          shadowOpacity: focused ? 0.55 : 0,
          shadowRadius: focused ? 5 : 0,
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const router = useRouter();
  const { i18n } = useTranslation();
  const bottomInset = Math.max(insets.bottom, 10);
  const language = i18n.language?.split('-')[0];
  const supportLabel =
    language === 'de' ? 'Brauchst du Hilfe?' :
    language === 'hr' ? 'Trebaš pomoć?' :
    'Need assistance?';
  const supportChannelId =
    language === 'de' ? '1545890557652635768' :
    language === 'hr' ? '1545891206322458775' :
    '1545880341699493978';
  const supportUrl = `https://discord.com/channels/1545876541387440188/${supportChannelId}`;

  useEffect(() => {
    let mounted = true;

    const register = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session?.user) {
        await registerForPushNotificationsAsync();
      }
    };

    register();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && event === 'SIGNED_IN' && session?.user) {
        registerForPushNotificationsAsync();
      }
    });

    const openChatFromNotification = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type !== 'message' || !data?.conversationId) return;
      router.push({
        pathname: '/chat',
        params: {
          conversationId: String(data.conversationId),
          name: String(data.name ?? 'SipMate'),
          id: String(data.id ?? ''),
        },
      });
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (mounted && response) openChatFromNotification(response);
    });

    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener(openChatFromNotification);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      notificationSubscription.remove();
    };
  }, [router]);

  useEffect(() => {
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const startHeartbeat = async () => {
      await touchPresence();
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        touchPresence();
      }, 45_000);
    };

    const stopHeartbeat = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    if (AppState.currentState === 'active') {
      startHeartbeat();
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startHeartbeat();
      } else {
        stopHeartbeat();
        if (state === 'background') {
          clearPresence();
        }
      }
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && AppState.currentState === 'active') {
        startHeartbeat();
      }
      if (event === 'SIGNED_OUT') {
        stopHeartbeat();
      }
    });

    return () => {
      stopHeartbeat();
      appStateSubscription.remove();
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const currentRoute = segments[0] ?? '';
  const hideSupport =
    currentRoute === 'login' ||
    currentRoute === 'register' ||
    currentRoute === 'onboarding' ||
    currentRoute === 'forgot-password' ||
    currentRoute === 'reset-password' ||
    currentRoute === 'chat';

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#F87171',
          tabBarInactiveTintColor: '#8D8D96',
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: bottomInset,
            height: 70,
            paddingTop: 8,
            paddingBottom: 7,
            backgroundColor: 'rgba(14,14,17,0.97)',
            borderTopWidth: 1,
            borderWidth: 1,
            borderColor: 'rgba(248,113,113,0.22)',
            borderRadius: 26,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.38,
            shadowRadius: 28,
            elevation: 14,
          },
          tabBarItemStyle: {
            borderRadius: 18,
            marginHorizontal: 3,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 0.2,
            marginTop: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Discover',
            tabBarIcon: ({ focused }) => <TabIcon icon="🍻" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="nearby"
          options={{
            title: 'Nearby',
            tabBarIcon: ({ focused }) => <TabIcon icon="📍" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
          }}
        />

        <Tabs.Screen name="login" options={{ href: null, tabBarStyle: hiddenTabBar }} />
        <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: hiddenTabBar }} />
        <Tabs.Screen name="register" options={{ href: null, tabBarStyle: hiddenTabBar }} />
        <Tabs.Screen name="forgot-password" options={{ href: null, tabBarStyle: hiddenTabBar }} />
        <Tabs.Screen name="reset-password" options={{ href: null, tabBarStyle: hiddenTabBar }} />

        <Tabs.Screen name="activity" options={{ href: null }} />
        <Tabs.Screen name="blocked-users" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: hiddenTabBar }} />
        <Tabs.Screen name="chats" options={{ href: null }} />
        <Tabs.Screen name="cheers" options={{ href: null }} />
        <Tabs.Screen name="community-guidelines" options={{ href: null }} />
        <Tabs.Screen name="delete-account" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="language" options={{ href: null }} />
        <Tabs.Screen name="premium" options={{ href: null }} />
        <Tabs.Screen name="privacy" options={{ href: null }} />
        <Tabs.Screen name="user-profile" options={{ href: null }} />
      </Tabs>

      {!hideSupport && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={supportLabel}
          onPress={() => Linking.openURL(supportUrl)}
          style={({ pressed }) => ({
            position: 'absolute',
            right: 18,
            bottom: 92 + bottomInset,
            minHeight: 42,
            maxWidth: 190,
            paddingHorizontal: 14,
            borderRadius: 21,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: pressed ? '#211315' : '#121215',
            borderWidth: 1,
            borderColor: pressed ? '#6B3036' : '#3D282C',
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: pressed ? 0.16 : 0.08,
            shadowRadius: 14,
            elevation: 6,
          })}
        >
          <Text style={{ fontSize: 15 }}>💬</Text>
          <Text
            numberOfLines={1}
            style={{ color: '#F4F4F5', fontSize: 11, fontWeight: '800', fontFamily: 'sans-serif' }}
          >
            {supportLabel}
          </Text>
        </Pressable>
      )}
    </>
  );
}
