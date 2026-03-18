import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/ui/AppButton';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchContacts, removeContact } from '../../redux/slices/contactsSlice';
import { theme } from '../../utils/theme';

export const TrustedContactsScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const contacts = useAppSelector((state) => state.contacts.items);

  useEffect(() => {
    dispatch(fetchContacts());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.heading}>Trusted network</Text>
        <Text style={styles.summary}>People who get alerted first when you trigger SOS.</Text>
        <AppButton label="Add trusted contact" variant="secondary" onPress={() => navigation.navigate('AddContact')} style={styles.addButton} />
      </View>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.name}>{item.contactName}</Text>
              <Text style={styles.meta}>{item.relationship} · {item.phone}</Text>
            </View>
            <Pressable onPress={() => dispatch(removeContact(item.id))}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No trusted contacts yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    padding: theme.spacing.lg,
  },
  summaryCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    padding: theme.spacing.md,
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
  },
  summary: {
    color: theme.colors.muted,
    marginBottom: 12,
    marginTop: 8,
  },
  addButton: {
    marginTop: 4,
  },
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 16,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.muted,
    marginTop: 6,
  },
  remove: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  empty: {
    color: theme.colors.muted,
  },
});
