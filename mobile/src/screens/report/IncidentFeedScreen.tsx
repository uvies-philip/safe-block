import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchDigestFeed, fetchNearbyIncidents } from '../../redux/slices/incidentsSlice';
import { Incident } from '../../types';
import { incidentMeta, timeAgo, trustColor, trustLabel, trustProgress } from '../../utils/format';
import { theme } from '../../utils/theme';

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonPill} />
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
    <View style={styles.skeletonTrustBar} />
  </View>
);

// ─── Incident card ────────────────────────────────────────────────────────────

const IncidentCard = ({ item, onPress }: { item: Incident; onPress: () => void }) => {
  const meta = incidentMeta(item.type);
  const tColor = trustColor(item.trustScore);
  const tProgress = trustProgress(item.trustScore);

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* type pill */}
      <View style={[styles.typePill, { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}55` }]}>
        <Text style={styles.typeIcon}>{meta.icon}</Text>
        <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      {/* trust bar */}
      <View style={styles.trustRow}>
        <View style={styles.trustBarTrack}>
          <View style={[styles.trustBarFill, { width: `${tProgress * 100}%`, backgroundColor: tColor }]} />
        </View>
        <Text style={[styles.trustLabel, { color: tColor }]}>{trustLabel(item.trustScore)}</Text>
      </View>

      {/* meta row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>▲ {item.upvotes}</Text>
        {item.verified ? <Text style={styles.verifiedBadge}>✓ Verified by community</Text> : <Text style={styles.metaText}>Awaiting verification</Text>}
        <Text style={[styles.metaText, styles.metaTime]}>{timeAgo(item.timestamp)}</Text>
      </View>
    </Pressable>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export const IncidentFeedScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const incidents = useAppSelector((state) => state.incidents.items);
  const digestItems = useAppSelector((state) => state.incidents.digestItems);
  const loading = useAppSelector((state) => state.incidents.loading);
  const digestLoading = useAppSelector((state) => state.incidents.digestLoading);
  const [mode, setMode] = useState<'nearby' | 'digest'>('nearby');

  const refresh = useCallback(() => {
    if (mode === 'digest') {
      dispatch(fetchDigestFeed({ latitude: 6.5244, longitude: 3.3792 }));
      return;
    }

    dispatch(fetchNearbyIncidents({ latitude: 6.5244, longitude: 3.3792, radiusKm: 10 }));
  }, [dispatch, mode]);

  const activeItems = useMemo(() => (mode === 'digest' ? digestItems : incidents), [digestItems, incidents, mode]);
  const activeLoading = mode === 'digest' ? digestLoading : loading;

  useEffect(() => { refresh(); }, [refresh]);

  if (activeLoading && activeItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.heading}>Incident feed</Text>
          <Text style={styles.subheading}>{mode === 'digest' ? 'Loading neighborhood digest…' : 'Loading reports near you…'}</Text>
        </View>
        {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={activeItems}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.headerCard}>
          <Text style={styles.heading}>Incident feed</Text>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode('nearby')}
              style={[styles.modeChip, mode === 'nearby' ? styles.modeChipActive : null]}
            >
              <Text style={[styles.modeChipText, mode === 'nearby' ? styles.modeChipTextActive : null]}>Nearby</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('digest')}
              style={[styles.modeChip, mode === 'digest' ? styles.modeChipActive : null]}
            >
              <Text style={[styles.modeChipText, mode === 'digest' ? styles.modeChipTextActive : null]}>Digest</Text>
            </Pressable>
          </View>
          <Text style={styles.subheading}>
            {mode === 'digest'
              ? activeItems.length > 0
                ? `${activeItems.length} high-signal alerts in your neighborhood digest`
                : 'Digest highlights most trusted, recent community alerts.'
              : activeItems.length > 0
                ? `${activeItems.length} report${activeItems.length !== 1 ? 's' : ''} near you`
                : 'Community safety reports around you.'}
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={activeLoading} onRefresh={refresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
      }
      renderItem={({ item }) => (
        <IncidentCard
          item={item}
          onPress={() => navigation.navigate('IncidentDetails', { incidentId: item.id })}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>All clear here</Text>
          <Text style={styles.emptyBody}>No incidents reported in your area yet. Pull down to refresh.</Text>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  headerCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
  },
  subheading: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modeChip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeChipActive: {
    backgroundColor: `${theme.colors.secondary}22`,
    borderColor: theme.colors.secondary,
  },
  modeChipText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: theme.colors.secondarySoft,
  },
  // incident card
  card: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeIcon: {
    fontSize: 13,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  description: {
    color: theme.colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  // trust bar
  trustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  trustBarTrack: {
    backgroundColor: theme.colors.trustBarBg,
    borderRadius: theme.radius.pill,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  trustBarFill: {
    borderRadius: theme.radius.pill,
    height: 4,
  },
  trustLabel: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'right',
  },
  // meta row
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  metaTime: {
    marginLeft: 'auto',
  },
  verifiedBadge: {
    backgroundColor: `${theme.colors.success}22`,
    borderRadius: theme.radius.pill,
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  separator: {
    height: theme.spacing.sm,
  },
  // skeleton
  skeletonCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  skeletonPill: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: theme.radius.pill,
    height: 22,
    marginBottom: 12,
    width: '40%',
  },
  skeletonLine: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: 4,
    height: 14,
    marginBottom: 8,
    width: '90%',
  },
  skeletonLineShort: {
    width: '65%',
    marginBottom: 14,
  },
  skeletonTrustBar: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: 4,
    height: 4,
    width: '100%',
  },
  // empty state
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.h3,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
});
