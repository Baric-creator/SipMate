import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function showPushDebug(title: string, message: string) {
  Alert.alert(title, message);
}

export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === 'web') {
      showPushDebug('PUSH DEBUG', 'SKIP: web platform');
      return null;
    }

    if (!Device.isDevice) {
      showPushDebug('PUSH DEBUG', 'SKIP: Expo does not recognize this as a physical device');
      return null;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 180, 250],
          lightColor: '#EF4444',
          sound: 'default',
        });
      } catch (error: any) {
        showPushDebug(
          'PUSH ERROR — CHANNEL',
          error?.message ?? String(error)
        );
        return null;
      }
    }

    let existingStatus: Notifications.PermissionStatus;

    try {
      const permissions = await Notifications.getPermissionsAsync();
      existingStatus = permissions.status;
    } catch (error: any) {
      showPushDebug(
        'PUSH ERROR — PERMISSIONS',
        `getPermissionsAsync failed:\n${error?.message ?? String(error)}`
      );
      return null;
    }

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      } catch (error: any) {
        showPushDebug(
          'PUSH ERROR — PERMISSION REQUEST',
          error?.message ?? String(error)
        );
        return null;
      }
    }

    if (finalStatus !== 'granted') {
      showPushDebug(
        'PUSH DEBUG',
        `Notification permission is: ${finalStatus}`
      );
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      showPushDebug('PUSH ERROR — PROJECT ID', 'EAS project ID is missing');
      return null;
    }

    let pushToken: string;

    try {
      pushToken = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;
    } catch (error: any) {
      showPushDebug(
        'PUSH ERROR — EXPO TOKEN',
        `${error?.message ?? String(error)}\n\nProject ID: ${projectId}`
      );
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      showPushDebug(
        'PUSH ERROR — SESSION',
        `Expo token was created, but there is no logged-in Supabase session.\n\n${pushToken}`
      );
      return pushToken;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        'register-push-token',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            token: pushToken,
            platform: Platform.OS,
          },
        }
      );

      if (error) {
        showPushDebug(
          'PUSH ERROR — REGISTER',
          `${error.message}\n\nToken: ${pushToken}`
        );
        return null;
      }

      showPushDebug(
        'PUSH OK ✅',
        `Token registered successfully.\n\n${pushToken}\n\nResponse: ${JSON.stringify(data ?? {})}`
      );

      return pushToken;
    } catch (error: any) {
      showPushDebug(
        'PUSH ERROR — FUNCTION',
        `${error?.message ?? String(error)}\n\nToken: ${pushToken}`
      );
      return null;
    }
  } catch (error: any) {
    showPushDebug(
      'PUSH ERROR — UNKNOWN',
      error?.message ?? String(error)
    );
    return null;
  }
}
