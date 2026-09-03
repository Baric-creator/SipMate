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
  title: string,
  message: string,
  cancelLabel = 'Cancel',
  confirmLabel = 'OK'
): Promise<boolean> {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
  ) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelLabel,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmLabel,
          style: 'destructive',
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
