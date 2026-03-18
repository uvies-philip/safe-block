import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LogoMark } from '../../components/branding/LogoMark';
import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { register } from '../../redux/slices/authSlice';
import { theme } from '../../utils/theme';

export const RegisterScreen = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    photoUrl: '',
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LogoMark size={56} />
      <Text style={styles.subtitle}>Create an account to send SOS alerts and report incidents quickly.</Text>
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <AppInput label="Full name" placeholder="John Doe" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} containerStyle={styles.inputGroup} />
        <AppInput label="Phone number" placeholder="08000000000" value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} keyboardType="phone-pad" containerStyle={styles.inputGroup} />
        <AppInput label="Email" placeholder="you@example.com" value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} autoCapitalize="none" keyboardType="email-address" containerStyle={styles.inputGroup} />
        <AppInput label="Password" placeholder="Minimum 8 characters" value={form.password} onChangeText={(password) => setForm((current) => ({ ...current, password }))} secureTextEntry containerStyle={styles.inputGroup} />
        <AppInput label="Photo URL (optional)" placeholder="https://..." value={form.photoUrl} onChangeText={(photoUrl) => setForm((current) => ({ ...current, photoUrl }))} autoCapitalize="none" containerStyle={styles.inputGroup} />
        <AppButton label="Register" loading={loading} onPress={() => dispatch(register(form))} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    marginBottom: theme.spacing.md,
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
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  error: {
    color: theme.colors.danger,
    marginTop: 12,
    textAlign: 'center',
  },
});
