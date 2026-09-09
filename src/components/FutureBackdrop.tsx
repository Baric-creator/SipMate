import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function FutureBackdrop() {
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 7200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 7200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    driftLoop.start();

    return () => {
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [drift, pulse]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.24],
  });

  const driftX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 18],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.glowTop,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }, { translateX: driftX }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowBottom,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      <View style={styles.railTop} />
      <View style={styles.railRight} />
      <View style={styles.cornerTopLeftH} />
      <View style={styles.cornerTopLeftV} />
      <View style={styles.cornerBottomRightH} />
      <View style={styles.cornerBottomRightV} />

      <View style={[styles.scanline, { top: '18%' }]} />
      <View style={[styles.scanline, { top: '36%' }]} />
      <View style={[styles.scanline, { top: '54%' }]} />
      <View style={[styles.scanline, { top: '72%' }]} />
      <View style={[styles.scanline, { top: '90%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glowTop: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    top: -170,
    right: -150,
    backgroundColor: '#DC2626',
    shadowColor: '#EF4444',
    shadowOpacity: 0.22,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  glowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: -150,
    left: -155,
    backgroundColor: '#7F1D1D',
    shadowColor: '#EF4444',
    shadowOpacity: 0.16,
    shadowRadius: 64,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  railTop: {
    position: 'absolute',
    top: 2,
    left: '18%',
    right: '18%',
    height: 1,
    backgroundColor: 'rgba(248,113,113,0.18)',
  },
  railRight: {
    position: 'absolute',
    top: '18%',
    bottom: '24%',
    right: 2,
    width: 1,
    backgroundColor: 'rgba(248,113,113,0.10)',
  },
  scanline: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.018)',
  },
  cornerTopLeftH: {
    position: 'absolute',
    top: 18,
    left: 12,
    width: 24,
    height: 1,
    backgroundColor: 'rgba(248,113,113,0.24)',
  },
  cornerTopLeftV: {
    position: 'absolute',
    top: 18,
    left: 12,
    width: 1,
    height: 24,
    backgroundColor: 'rgba(248,113,113,0.24)',
  },
  cornerBottomRightH: {
    position: 'absolute',
    right: 12,
    bottom: 108,
    width: 24,
    height: 1,
    backgroundColor: 'rgba(248,113,113,0.18)',
  },
  cornerBottomRightV: {
    position: 'absolute',
    right: 12,
    bottom: 108,
    width: 1,
    height: 24,
    backgroundColor: 'rgba(248,113,113,0.18)',
  },
});
