import { Tabs, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import '../lib/i18n';

const hiddenTabBar = { display: 'none' as const };

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View
      style={{
        minWidth: 38,
        height: 30,
        paddingHorizontal: 9,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? '#241316' : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? '#5A2A2F' : 'transparent',
        shadowColor: focused ? '#EF4444' : '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: focused ? 0.16 : 0,
        shadowRadius: focused ? 8 : 0,
        elevation: focused ? 2 : 0,
      }}
    >
      <Text
        style={{
          fontSize: 19,
          opacity: focused ? 1 : 0.62,
          transform: [{ scale: focused ? 1.06 : 1 }],
        }}
      >
        {icon}
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
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
            backgroundColor: '#121215',
            borderTopWidth: 1,
            borderWidth: 1,
            borderColor: '#3A2A2D',
            borderRadius: 26,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.30,
            shadowRadius: 24,
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
