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
    shouldSetBadge: true,
  }),
});

type PushRegistrationTask = {
  userId: string;
  promise: Promise<string | null>;
};

let registrationInFlight: PushRegistrationTask | null = null;

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

async function registerForPushNotificationsInternal(expectedUserId: string) {
  if (Platform.OS === 'web' || !Device.isDevice) {
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

    await Notifications.setNotificationChannelAsync('cheers', {
      name: 'Cheers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 180, 100, 280],
      lightColor: '#EF4444',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('nearby', {
      name: 'Nearby activity',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 220],
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
    return null;
  }

  const projectId = getProjectId();

  if (!projectId) {
    return null;
  }

  try {
    const pushToken = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (
      !session?.access_token ||
      !session.user ||
      session.user.id !== expectedUserId
    ) {
      return null;
    }

    const { error } = await supabase.functions.invoke('register-push-token', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        action: 'register',
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

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  if (registrationInFlight?.userId === userId) {
    return registrationInFlight.promise;
  }

  const promise = registerForPushNotificationsInternal(userId);
  const task: PushRegistrationTask = { userId, promise };
  registrationInFlight = task;

  try {
    return await promise;
  } finally {
    if (registrationInFlight === task) {
      registrationInFlight = null;
    }
  }
}

export async function unregisterCurrentDevicePushTokenAsync() {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    const accessToken = session?.access_token;
    if (!userId || !accessToken) return;

    if (registrationInFlight?.userId === userId) {
      await registrationInFlight.promise.catch(() => null);
    }

    const projectId = getProjectId();
    if (!projectId) return;

    const pushToken = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    const { error } = await supabase.functions.invoke('register-push-token', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        action: 'unregister',
        token: pushToken,
      },
    });

    if (error) {
      console.log('PUSH TOKEN UNREGISTER ERROR:', error.message);
    }
  } catch (error) {
    console.log('PUSH TOKEN UNREGISTER ERROR:', error);
  }
}
