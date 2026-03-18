import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { theme } from '../../utils/theme';

export const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Password reset delivery is deferred until an email provider is configured.</Text>
      <View style={styles.card}>
        <AppInput label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" containerStyle={styles.inputGroup} />
        <AppButton label="Request reset" variant="secondary" onPress={() => setSubmitted(Boolean(email))} />
      </View>
      {submitted ? <Text style={styles.notice}>Reset request recorded for {email}.</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    marginBottom: 24,
  },
  card: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: 12,
  },
  notice: {
    color: theme.colors.success,
    marginTop: 16,
    textAlign: 'center',
  },
});
