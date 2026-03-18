import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LogoMark } from '../../components/branding/LogoMark';
import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { clearError, login } from '../../redux/slices/authSlice';
import { theme } from '../../utils/theme';

export const LoginScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // clear stale error on input change
  useEffect(() => {
    if (error) dispatch(clearError());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !loading;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LogoMark size={58} />
        <Text style={styles.subtitle}>Sign in to alert your trusted network in seconds.</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <AppInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            containerStyle={styles.inputGroup}
          />
          <View style={styles.passwordContainer}>
            <AppInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              containerStyle={styles.passwordInput}
            />
            <Pressable style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>
          <AppButton
            label="Sign in"
            loading={loading}
            disabled={!canSubmit}
            onPress={() => dispatch(login({ email: email.trim(), password }))}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.linkRow}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
          <Text style={styles.link}>Create account →</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
    marginBottom: 14,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 24,
    marginBottom: 24,
    marginTop: 10,
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
  passwordContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 26, // below label
  },
  eyeIcon: {
    fontSize: 18,
  },
  link: {
    color: theme.colors.secondary,
    fontSize: 15,
    textAlign: 'center',
  },
  linkRow: {
    marginTop: 12,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    textAlign: 'center',
  },
});
