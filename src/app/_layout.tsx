import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '../lib/i18n';

const hiddenTabBar = { display: 'none' as const };

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#EF4444',
          tabBarInactiveTintColor: '#E4E4E7',
          tabBarStyle: {
            backgroundColor: '#09090B',
            borderTopColor: '#18181B',
            height: 72,
            paddingTop: 8,
            paddingBottom: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '800',
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Discover' }} />
        <Tabs.Screen name="nearby" options={{ title: 'Nearby' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

        <Tabs.Screen name="login" options={{ href: null, tabBarStyle: hiddenTabBar }} />
        <Tabs.Screen name="register" options={{ href: null, tabBarStyle: hiddenTabBar }} />

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
    </>
  );
}
