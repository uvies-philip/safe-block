import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { theme } from '../utils/theme';

const HOLD_DURATION = 3000;
const COUNTDOWN_SECONDS = 3;

type Props = {
  onPress: () => void;
  loading?: boolean;
  size?: number;
};

export const SOSButton = ({ onPress, loading = false, size = 220 }: Props) => {
  const pulseOne = useRef(new Animated.Value(0)).current;
  const pulseTwo = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);
  const triggerFired = useRef(false);
  const [isHolding, setIsHolding] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // pulse rings
  useEffect(() => {
    const createPulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const a1 = createPulse(pulseOne, 0);
    const a2 = createPulse(pulseTwo, 900);
    a1.start();
    a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, [pulseOne, pulseTwo]);

  const onPressIn = useCallback(() => {
    if (loading) return;

    triggerFired.current = false;
    setIsHolding(true);
    setCountdown(COUNTDOWN_SECONDS);
    Vibration.vibrate(10);

    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }

    const holdStartedAt = Date.now();

    countdownTimer.current = setInterval(() => {
      const elapsedMs = Date.now() - holdStartedAt;
      const nextCount = Math.max(1, COUNTDOWN_SECONDS - Math.floor(elapsedMs / 1000));
      setCountdown(nextCount);
    }, 120);

    holdProgress.setValue(0);
    holdAnim.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    holdAnim.current.start(({ finished }) => {
      if (finished && !triggerFired.current) {
        triggerFired.current = true;
        setIsHolding(false);
        holdProgress.setValue(0);
        setCountdown(0);

        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }

        Vibration.vibrate([0, 50, 40, 80]);
        onPress();
      }
    });
  }, [loading, holdProgress, onPress]);

  const onPressOut = useCallback(() => {
    if (triggerFired.current) return;

    holdAnim.current?.stop();
    setIsHolding(false);
    setCountdown(COUNTDOWN_SECONDS);

    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }

    Animated.timing(holdProgress, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  }, [holdProgress]);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []);

  const ringSize = size + 28;
  const holdBarWidth = holdProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.wrapper, { width: ringSize, height: ringSize }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pulse, {
          width: ringSize, height: ringSize, borderRadius: ringSize / 2,
          opacity: pulseOne.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0] }),
          transform: [{ scale: pulseOne.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.22] }) }],
        }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.pulse, {
          width: ringSize, height: ringSize, borderRadius: ringSize / 2,
          opacity: pulseTwo.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] }),
          transform: [{ scale: pulseTwo.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.26] }) }],
        }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trigger SOS alert"
        accessibilityHint="Hold for 3 seconds to send an emergency alert to your trusted contacts"
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <View style={styles.holdBarTrack} pointerEvents="none">
          <Animated.View style={[styles.holdBarFill, { width: holdBarWidth }]} />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.text} size="large" />
        ) : (
          <>
            <Text style={[styles.label, { fontSize: Math.max(44, size * 0.25) }]}>SOS</Text>
            {isHolding ? <Text style={styles.countdown}>{countdown}</Text> : null}
            <Text style={styles.caption}>{isHolding ? 'Keep holding…' : 'Hold 3s to send alert'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    backgroundColor: theme.colors.glow,
    position: 'absolute',
  },
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primarySoft,
    borderWidth: 3,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
  },
  holdBarTrack: {
    bottom: 0,
    height: 5,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  holdBarFill: {
    backgroundColor: theme.colors.text,
    height: 5,
    opacity: 0.85,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '800',
    letterSpacing: 2,
  },
  countdown: {
    color: theme.colors.text,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
    marginTop: 4,
  },
  caption: {
    color: theme.colors.text,
    fontSize: 13,
    marginTop: 6,
    opacity: 0.88,
    textAlign: 'center',
  },
});
