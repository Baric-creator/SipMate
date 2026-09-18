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


export function chooseOption<T extends string>(
  title: string,
  message: string,
  options: Array<{ label: string; value: T; destructive?: boolean }>,
  cancelLabel = 'Cancel'
): Promise<T | null> {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
  ) {
    const list = options.map((option, index) => `${index + 1}. ${option.label}`).join('\n');
    const answer = window.prompt(`${title}\n\n${message}\n\n${list}\n\n${cancelLabel}: leave blank`);
    if (!answer) return Promise.resolve(null);
    const index = Number(answer) - 1;
    return Promise.resolve(options[index]?.value ?? null);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        ...options.map((option) => ({
          text: option.label,
          style: option.destructive ? 'destructive' as const : 'default' as const,
          onPress: () => resolve(option.value),
        })),
        {
          text: cancelLabel,
          style: 'cancel' as const,
          onPress: () => resolve(null),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(null),
      }
    );
  });
}
