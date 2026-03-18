import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../utils/theme';

export type MapFilters = {
  incidents: boolean;
  sos: boolean;
  roadblocks: boolean;
  hotspots: boolean;
};

type Props = {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
};

const ToggleChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
  </Pressable>
);

export const MapFilterBar = ({ filters, onChange }: Props) => {
  return (
    <View style={styles.row}>
      <ToggleChip label="Incidents" active={filters.incidents} onPress={() => onChange({ ...filters, incidents: !filters.incidents })} />
      <ToggleChip label="SOS alerts" active={filters.sos} onPress={() => onChange({ ...filters, sos: !filters.sos })} />
      <ToggleChip label="Roadblocks" active={filters.roadblocks} onPress={() => onChange({ ...filters, roadblocks: !filters.roadblocks })} />
      <ToggleChip label="Hotspots" active={filters.hotspots} onPress={() => onChange({ ...filters, hotspots: !filters.hotspots })} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: `${theme.colors.secondary}22`,
    borderColor: theme.colors.secondary,
  },
  chipText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: theme.colors.secondarySoft,
  },
});
