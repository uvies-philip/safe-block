import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../utils/theme';
import { LogoMark } from './LogoMark';

type AppSplashProps = {
  onReady: () => void;
};

export const AppSplash = ({ onReady }: AppSplashProps) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onReady, 1500);
    return () => clearTimeout(timer);
  }, [fade, onReady, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <LogoMark size={84} />
      </Animated.View>
      <Text style={styles.subtitle}>Alerts in seconds. Help in minutes.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    marginTop: theme.spacing.md,
  },
});
