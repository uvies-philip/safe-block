import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { theme } from '../../utils/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
};

export const AppButton = ({ label, onPress, loading = false, disabled = false, variant = 'primary', style }: AppButtonProps) => {
  const secondary = variant === 'secondary';
  const danger = variant === 'danger';
  const inactive = loading || disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : danger ? styles.buttonDanger : styles.buttonPrimary,
        inactive ? styles.buttonDisabled : null,
        pressed && !inactive ? styles.buttonPressed : null,
        style,
      ]}
      onPress={inactive ? undefined : onPress}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? theme.colors.muted : theme.colors.text} size="small" />
      ) : (
        <Text style={[styles.label, secondary ? styles.labelSecondary : null, inactive ? styles.labelDisabled : null]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    ...theme.elevation.card,
    borderRadius: theme.radius.md,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
  },
  buttonDanger: {
    backgroundColor: theme.colors.danger,
  },
  buttonDisabled: {
    opacity: 0.42,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  labelSecondary: {
    color: theme.colors.textSoft,
  },
  labelDisabled: {
    color: theme.colors.muted,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
