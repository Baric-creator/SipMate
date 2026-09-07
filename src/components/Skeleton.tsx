import { useEffect, useRef } from 'react';
import {
  Animated,
  DimensionValue,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height,
  radius = 12,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function ProfileCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={52} height={52} radius={26} />
        <View style={styles.grow}>
          <Skeleton width="58%" height={14} radius={7} />
          <Skeleton width="36%" height={10} radius={5} style={styles.line} />
        </View>
      </View>
      <Skeleton height={52} radius={14} style={styles.block} />
    </View>
  );
}

export function ChatCardSkeleton() {
  return (
    <View style={styles.chatCard}>
      <Skeleton width={52} height={52} radius={26} />
      <View style={styles.grow}>
        <Skeleton width="42%" height={14} radius={7} />
        <Skeleton width="72%" height={10} radius={5} style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#2A2A2F',
  },
  card: {
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#242428',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  chatCard: {
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#242428',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  grow: {
    flex: 1,
  },
  line: {
    marginTop: 8,
  },
  block: {
    marginTop: 14,
  },
});
