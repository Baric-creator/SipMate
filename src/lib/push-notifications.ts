import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web' || !Device.isDevice) {
    console.log('PUSH NOTIFICATIONS: physical device required');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: '#EF4444',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('PUSH NOTIFICATIONS: permission not granted');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log('PUSH NOTIFICATIONS: EAS project ID missing');
    return null;
  }

  try {
    const pushToken = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return pushToken;

    const { error } = await supabase.functions.invoke('register-push-token', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        token: pushToken,
        platform: Platform.OS,
      },
    });

    if (error) {
      console.log('PUSH TOKEN REGISTER ERROR:', error.message);
      return null;
    }

    console.log('PUSH TOKEN REGISTERED');
    return pushToken;
  } catch (error) {
    console.log('PUSH TOKEN ERROR:', error);
    return null;
  }
}
