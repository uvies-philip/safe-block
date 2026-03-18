import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IncidentType } from '../../types';
import { incidentMeta } from '../../utils/format';
import { theme } from '../../utils/theme';

type Props = {
  selectedType: IncidentType;
  onSelectType: (type: IncidentType) => void;
};

const QUICK_TYPES: IncidentType[] = ['ROBBERY', 'POLICE_EXTORTION', 'ACCIDENT', 'ROADBLOCK', 'SUSPICIOUS_ACTIVITY', 'FIRE'];

export const QuickReportChips = ({ selectedType, onSelectType }: Props) => {
  return (
    <View style={styles.grid}>
      {QUICK_TYPES.map((type) => {
        const meta = incidentMeta(type);
        const active = type === selectedType;

        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            onPress={() => onSelectType(type)}
            style={[
              styles.chip,
              active ? { borderColor: meta.color, backgroundColor: `${meta.color}20` } : null,
            ]}
          >
            <Text style={styles.icon}>{meta.icon}</Text>
            <Text style={[styles.label, active ? { color: meta.color } : null]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
});
