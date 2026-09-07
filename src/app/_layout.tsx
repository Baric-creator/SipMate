import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const bottomInset = Math.max(insets.bottom, 12);

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
