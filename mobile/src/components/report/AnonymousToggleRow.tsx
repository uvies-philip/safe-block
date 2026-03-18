import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { theme } from '../../utils/theme';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};

export const AnonymousToggleRow = ({ value, onChange }: Props) => {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Report anonymously</Text>
        <Text style={styles.subtitle}>Your identity stays hidden from other users.</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: theme.colors.borderStrong, true: `${theme.colors.secondary}88` }} thumbColor={value ? theme.colors.secondary : theme.colors.muted} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 12,
  },
});
