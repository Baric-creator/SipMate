import { Alert, Platform } from 'react-native';

export function showAlert(
  message: string,
  title = 'SipMate'
) {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
  ) {
    window.alert(message);
    return;
  }

  Alert.alert(title, message);
}

export function askConfirmation(
  message: string,
  title = 'SipMate'
): Promise<boolean> {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
  ) {
    return Promise.resolve(
      window.confirm(message)
    );
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'OK',
          onPress: () => resolve(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      }
    );
  });
}
