import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../utils/theme';

type ToastType = 'success' | 'error' | 'info';

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-14)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -14, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setMessage('');
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (nextMessage: string, nextType: ToastType = 'info', durationMs = 2200) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setMessage(nextMessage);
      setType(nextType);
      setVisible(true);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, durationMs);
    },
    [hideToast, opacity, translateY]
  );

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {visible ? (
        <View pointerEvents="none" style={[styles.viewport, { top: insets.top + 10 }]}>
          <Animated.View
            style={[
              styles.toast,
              type === 'success' ? styles.toastSuccess : type === 'error' ? styles.toastError : styles.toastInfo,
              { opacity, transform: [{ translateY }] },
            ]}
          >
            <Text style={styles.toastText}>{message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return ctx;
};

const styles = StyleSheet.create({
  viewport: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  toast: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    maxWidth: '92%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastSuccess: {
    backgroundColor: `${theme.colors.success}22`,
    borderColor: `${theme.colors.success}88`,
  },
  toastError: {
    backgroundColor: `${theme.colors.danger}22`,
    borderColor: `${theme.colors.danger}88`,
  },
  toastInfo: {
    backgroundColor: `${theme.colors.secondary}22`,
    borderColor: `${theme.colors.secondary}88`,
  },
  toastText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
