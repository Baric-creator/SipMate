import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type ProfileInitialAvatarProps = {
  name?: string | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ProfileInitialAvatar({ name, style, textStyle }: ProfileInitialAvatarProps) {
  return (
    <View style={[styles.avatar, style]}>
      <Text style={[styles.text, textStyle]}>
        {name?.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
