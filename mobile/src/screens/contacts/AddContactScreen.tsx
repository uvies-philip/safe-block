import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { useAppDispatch } from '../../redux/hooks';
import { addContact } from '../../redux/slices/contactsSlice';
import { theme } from '../../utils/theme';

export const AddContactScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    contactName: '',
    phone: '',
    relationship: '',
  });

  const submit = async () => {
    await dispatch(addContact(form));
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add trusted contact</Text>
      <Text style={styles.subheading}>Family, friends, or community leaders who should receive your SOS alerts.</Text>
      <View style={styles.card}>
        <AppInput label="Contact name" placeholder="Jane Doe" value={form.contactName} onChangeText={(contactName) => setForm((current) => ({ ...current, contactName }))} containerStyle={styles.inputGroup} />
        <AppInput label="Phone number" placeholder="08000000000" value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} keyboardType="phone-pad" containerStyle={styles.inputGroup} />
        <AppInput label="Relationship" placeholder="Sister" value={form.relationship} onChangeText={(relationship) => setForm((current) => ({ ...current, relationship }))} containerStyle={styles.inputGroup} />
        <AppButton label="Save contact" variant="secondary" onPress={submit} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    padding: theme.spacing.lg,
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
  },
  subheading: {
    color: theme.colors.muted,
    marginBottom: 14,
    marginTop: 8,
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
});
