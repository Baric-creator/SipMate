import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import '../lib/i18n';
import { clearPresence, touchPresence } from '../lib/presence';
import { captureGrowthAttributionFromUrl, clearGrowthAttribution, getGrowthAttribution } from '../lib/growth-attribution';
import { registerForPushNotificationsAsync } from '../lib/push-notifications';
import { AppRemoteConfig, loadAppRemoteConfig } from '../lib/remote-config';
import { supabase } from '../lib/supabase';
import { installGlobalTelemetry } from '../lib/telemetry';

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
  const [supportExpanded, setSupportExpanded] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<AppRemoteConfig | null>(null);
  const bottomInset = Math.max(insets.bottom, 10);
  const language = i18n.language?.split('-')[0];

  const tabLabels =
    language === 'de'
      ? { discover: 'Entdecken', nearby: 'In der Nähe', profile: 'Profil' }
      : language === 'hr'
        ? { discover: 'Otkrivaj', nearby: 'U blizini', profile: 'Profil' }
        : { discover: 'Discover', nearby: 'Nearby', profile: 'Profile' };

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
    installGlobalTelemetry();
  }, []);
  const androidVersionCode = Number(Constants.expoConfig?.android?.versionCode ?? 1);
  const updateRequired = Platform.OS === 'android' && remoteConfig !== null && androidVersionCode < remoteConfig.minAndroidVersionCode;

  useEffect(() => {
    let mounted = true;

    void Linking.getInitialURL().then((initialUrl) => {
      if (mounted) void captureGrowthAttributionFromUrl(initialUrl);
    });
    const deepLinkSubscription = Linking.addEventListener('url', ({ url }) => {
      void captureGrowthAttributionFromUrl(url);
    });

    const register = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session?.user) {
        const attribution = await getGrowthAttribution();
        if (attribution.referralCode || attribution.source) {
          const { error: attributionError } = await supabase.functions.invoke('claim-attribution', {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            body: { referralCode: attribution.referralCode, source: attribution.source },
          });
          if (!attributionError) await clearGrowthAttribution();
          else console.log('ATTRIBUTION CLAIM ERROR:', attributionError.message);
        }
        await registerForPushNotificationsAsync();
      }
    };

    register();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && event === 'SIGNED_IN' && session?.user) {
        registerForPushNotificationsAsync();
      }
    });

    const openFromNotification = async (response: Notifications.NotificationResponse) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'message' && data?.conversationId) {
        router.push({ pathname: '/chat', params: { conversationId: String(data.conversationId) } });
        return;
      }
      if (data?.type === 'cheers' && data?.id) {
        await AsyncStorage.setItem('sipmate:activity-seen-at', new Date().toISOString());
        router.push({ pathname: '/user-profile', params: { id: String(data.id) } });
      }
    };

    Notifications.getLastNotificationResponseAsync().then(async (response) => {
      if (mounted && response) {
        await openFromNotification(response);
        await Notifications.clearLastNotificationResponseAsync();
      }
    });

    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void openFromNotification(response);
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      notificationSubscription.remove();
      deepLinkSubscription.remove();
    };
  }, [router]);

  useEffect(() => {
    let active = true;
    const refreshRemoteConfig = () => {
      void loadAppRemoteConfig().then((config) => {
        if (active) setRemoteConfig(config);
      });
    };
    refreshRemoteConfig();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshRemoteConfig();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let heartbeatGeneration = 0;

    const stopHeartbeat = () => {
      heartbeatGeneration += 1;
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    const startHeartbeat = async () => {
      const generation = ++heartbeatGeneration;
      await touchPresence();

      if (
        generation !== heartbeatGeneration ||
        AppState.currentState !== 'active'
      ) {
        await clearPresence();
        return;
      }

      if (heartbeat) clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (AppState.currentState === 'active') {
          void touchPresence();
        }
      }, 45_000);
    };

    if (AppState.currentState === 'active') {
      void startHeartbeat();
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void startHeartbeat();
      } else {
        stopHeartbeat();
        if (state === 'background') {
          void clearPresence();
        }
      }
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && AppState.currentState === 'active') {
        void startHeartbeat();
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
  const featureDisabled =
    (currentRoute === 'premium' && remoteConfig?.featureFlags.premium === false) ||
    (currentRoute === 'nearby' && remoteConfig?.featureFlags.nearby === false);
  const hideSupport =
    currentRoute === 'login' ||
    currentRoute === 'register' ||
    currentRoute === 'onboarding' ||
    currentRoute === 'forgot-password' ||
    currentRoute === 'reset-password' ||
    currentRoute === 'chat';

  useEffect(() => {
    setSupportExpanded(false);
  }, [currentRoute]);

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
            title: tabLabels.discover,
            tabBarIcon: ({ focused }) => <TabIcon icon="🍻" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="nearby"
          options={{
            title: tabLabels.nearby,
            tabBarIcon: ({ focused }) => <TabIcon icon="📍" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: tabLabels.profile,
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
        <Tabs.Screen name="account-safety" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: hiddenTabBar }} />
        <Tabs.Screen name="chats" options={{ href: null }} />
        <Tabs.Screen name="cheers" options={{ href: null }} />
        <Tabs.Screen name="community-guidelines" options={{ href: null }} />
        <Tabs.Screen name="delete-account" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="language" options={{ href: null }} />
        <Tabs.Screen name="invite" options={{ href: null }} />
        <Tabs.Screen name="notification-settings" options={{ href: null }} />
        <Tabs.Screen name="premium" options={{ href: null }} />
        <Tabs.Screen name="privacy" options={{ href: null }} />
        <Tabs.Screen name="terms" options={{ href: null }} />
        <Tabs.Screen name="user-profile" options={{ href: null }} />
      </Tabs>

      {(remoteConfig?.maintenanceMode || updateRequired || featureDisabled) && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#09090B',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <Text style={{ fontSize: 58 }}>{updateRequired ? '⬆️' : featureDisabled ? '⏸️' : '🛠️'}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 18 }}>
            {updateRequired
              ? (language === 'de' ? 'SipMate aktualisieren' : language === 'hr' ? 'Ažuriraj SipMate' : 'Update SipMate')
              : featureDisabled
                ? (language === 'de' ? 'Funktion vorübergehend pausiert' : language === 'hr' ? 'Funkcija je privremeno pauzirana' : 'Feature temporarily paused')
                : (language === 'de' ? 'Kurze Wartungspause' : language === 'hr' ? 'Kratko održavanje' : 'Quick maintenance break')}
          </Text>
          <Text style={{ color: '#A1A1AA', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12, maxWidth: 430 }}>
            {updateRequired
              ? (language === 'de' ? 'Eine neuere SipMate-Version ist erforderlich, um fortzufahren.' : language === 'hr' ? 'Za nastavak je potrebna novija verzija SipMatea.' : 'A newer SipMate version is required to continue.')
              : featureDisabled
                ? (language === 'de' ? 'Diese Funktion wurde im Founder Control vorübergehend deaktiviert.' : language === 'hr' ? 'Ova je funkcija privremeno isključena u Founder Controlu.' : 'This feature was temporarily disabled in Founder Control.')
                : (language === 'de' ? 'SipMate wird gerade kurz aktualisiert. Versuch es gleich noch einmal.' : language === 'hr' ? 'SipMate se trenutno kratko održava. Pokušaj ponovno uskoro.' : 'SipMate is temporarily under maintenance. Try again shortly.')}
          </Text>
          {updateRequired && remoteConfig?.playStoreUrl && (
            <Pressable
              onPress={() => void Linking.openURL(remoteConfig.playStoreUrl!)}
              style={{ marginTop: 24, backgroundColor: '#DC2626', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>
                {language === 'de' ? 'GOOGLE PLAY ÖFFNEN' : language === 'hr' ? 'OTVORI GOOGLE PLAY' : 'OPEN GOOGLE PLAY'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {!hideSupport && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: 18,
            bottom: 94 + bottomInset,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {supportExpanded && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={supportLabel}
              onPress={() => {
                setSupportExpanded(false);
                void Linking.openURL(supportUrl);
              }}
              style={({ pressed }) => ({
                minHeight: 42,
                maxWidth: 170,
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
              <Text
                numberOfLines={1}
                style={{ color: '#F4F4F5', fontSize: 11, fontWeight: '800', fontFamily: 'sans-serif' }}
              >
                {supportLabel}
              </Text>
              <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '900' }}>→</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={supportExpanded ? `${supportLabel} close` : supportLabel}
            onPress={() => setSupportExpanded((current) => !current)}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#211315' : '#121215',
              borderWidth: 1,
              borderColor: pressed || supportExpanded ? '#6B3036' : '#3D282C',
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: supportExpanded ? 0.18 : 0.08,
              shadowRadius: 14,
              elevation: 7,
            })}
          >
            <Text style={{ fontSize: 18 }}>{supportExpanded ? '×' : '💬'}</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}
