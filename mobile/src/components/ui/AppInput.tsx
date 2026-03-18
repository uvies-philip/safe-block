import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';

import { theme } from '../../utils/theme';

type AppInputProps = TextInputProps & {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const AppInput = ({ label, containerStyle, ...props }: AppInputProps) => {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput {...props} placeholderTextColor={theme.colors.muted} style={[styles.input, props.style as StyleProp<TextStyle>]} />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    color: theme.colors.textSoft,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
