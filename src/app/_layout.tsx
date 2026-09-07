import { Tabs, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import '../lib/i18n';

const hiddenTabBar = { display: 'none' as const };

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
        opacity: focused ? 1 : 0.7,
        marginBottom: 2,
      }}
    >
      {icon}
    </Text>
  );
}

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { i18n } = useTranslation();
  const bottomInset = Math.max(insets.bottom, 12);
  const language = i18n.language?.split('-')[0];
  const supportLabel =
    language === 'de' ? 'Brauchst du Hilfe?' :
    language === 'hr' ? 'Trebaš pomoć?' :
    'Need assistance?';
  const currentRoute = segments[0] ?? '';
  const hideSupport = currentRoute === 'login' || currentRoute === 'register' || currentRoute === 'onboarding';

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#EF4444',
          tabBarInactiveTintColor: '#E4E4E7',
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#09090B',
            borderTopColor: '#18181B',
            height: 64 + bottomInset,
            paddingTop: 8,
            paddingBottom: bottomInset,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '800',
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

        <Tabs.Screen name="activity" options={{ href: null }} />
        <Tabs.Screen name="blocked-users" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
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
          onPress={() => Linking.openURL('https://discord.com/channels/1545876541387440188/1545889672448843856')}
          style={({ pressed }) => ({
            position: 'absolute',
            right: 16,
            bottom: 76 + bottomInset,
            minHeight: 42,
            maxWidth: 190,
            paddingHorizontal: 14,
            borderRadius: 21,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: pressed ? '#211315' : '#141417',
            borderWidth: 1,
            borderColor: '#3A2020',
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.24,
            shadowRadius: 12,
            elevation: 7,
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
