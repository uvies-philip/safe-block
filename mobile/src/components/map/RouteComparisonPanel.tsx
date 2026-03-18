import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteComparison, RouteOption } from '../../services/routeService';
import { theme } from '../../utils/theme';

type Props = {
  comparison: RouteComparison | null;
  selectedRouteId: string | null;
  loading: boolean;
  onSelect: (route: RouteOption) => void;
  onOpenExternal: (route: RouteOption) => void;
};

const RouteCard = ({
  route,
  selected,
  onSelect,
  onOpenExternal,
}: {
  route: RouteOption;
  selected: boolean;
  onSelect: () => void;
  onOpenExternal: () => void;
}) => (
  <View style={[styles.routeCard, selected ? styles.routeCardSelected : null]}>
    <Pressable onPress={onSelect}>
      <Text style={styles.routeTitle}>{route.label} route</Text>
      <Text style={styles.routeMeta}>{route.durationMinutes.toFixed(0)} min · {route.distanceKm.toFixed(1)} km</Text>
      <Text style={styles.riskMeta}>Risk {route.risk.riskScore.toFixed(1)} · Danger {route.risk.dangerHits} · Roadblocks {route.risk.roadblockHits}</Text>
    </Pressable>
    <Pressable onPress={onOpenExternal} style={styles.openBtn}>
      <Text style={styles.openBtnText}>Open</Text>
    </Pressable>
  </View>
);

export const RouteComparisonPanel = ({ comparison, selectedRouteId, loading, onSelect, onOpenExternal }: Props) => {
  if (loading) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Route planner</Text>
        <Text style={styles.placeholder}>Comparing fastest vs safest routes…</Text>
      </View>
    );
  }

  if (!comparison) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Route planner</Text>
        <Text style={styles.placeholder}>Select an alert or marker and tap Navigate to compare routes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Route comparison</Text>
      <RouteCard
        route={comparison.fastest}
        selected={selectedRouteId === comparison.fastest.id}
        onSelect={() => onSelect(comparison.fastest)}
        onOpenExternal={() => onOpenExternal(comparison.fastest)}
      />
      <RouteCard
        route={comparison.safest}
        selected={selectedRouteId === comparison.safest.id}
        onSelect={() => onSelect(comparison.safest)}
        onOpenExternal={() => onOpenExternal(comparison.safest)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: 10,
    padding: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  placeholder: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  routeCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  routeCardSelected: {
    borderColor: theme.colors.secondary,
  },
  routeTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  routeMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
    marginBottom: 2,
  },
  riskMeta: {
    color: theme.colors.warning,
    fontSize: 11,
  },
  openBtn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  openBtnText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
