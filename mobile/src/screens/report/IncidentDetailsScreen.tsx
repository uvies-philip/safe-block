import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/ui/AppButton';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchIncidentDetails, upvoteIncident, verifyIncident } from '../../redux/slices/incidentsSlice';
import { incidentMeta, timeAgo, trustColor, trustLabel, trustProgress } from '../../utils/format';
import { theme } from '../../utils/theme';

// ─── Trust score bar ──────────────────────────────────────────────────────────

const TrustBar = ({ score }: { score: number }) => {
  const color = trustColor(score);
  const progress = trustProgress(score);
  const label = trustLabel(score);
  return (
    <View style={tbStyles.wrapper}>
      <View style={tbStyles.header}>
        <Text style={tbStyles.title}>Trust score</Text>
        <Text style={[tbStyles.score, { color }]}>{score}/100 — {label}</Text>
      </View>
      <View style={tbStyles.track}>
        <View style={[tbStyles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const tbStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.trustBarBg,
    borderRadius: theme.radius.sm,
    marginBottom: 16,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  score: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: theme.radius.pill,
    height: 6,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export const IncidentDetailsScreen = ({ route }: any) => {
  const dispatch = useAppDispatch();
  const incident = useAppSelector((state) => state.incidents.selectedIncident);
  const actionLoading = useAppSelector((state) => state.incidents.actionLoading);
  const incidentId = route.params?.incidentId;

  const [upvoted, setUpvoted] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (incidentId) dispatch(fetchIncidentDetails(incidentId));
  }, [dispatch, incidentId]);

  useEffect(() => {
    if (incident) {
      setVerified(incident.verified);
    }
  }, [incident]);

  if (!incident) {
    return (
      <View style={styles.container}>
        <View style={styles.skeleton}>
          <View style={styles.skeletonTypePill} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonShort]} />
          <View style={styles.skeletonBar} />
        </View>
      </View>
    );
  }

  const meta = incidentMeta(incident.type);

  const handleUpvote = async () => {
    if (upvoted || actionLoading) return;
    setUpvoted(true);
    await dispatch(upvoteIncident(incident.id));
  };

  const handleVerify = async () => {
    if (verified || actionLoading) return;
    await dispatch(verifyIncident(incident.id));
    setVerified(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* type header */}
      <View style={[styles.typeHeader, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}44` }]}>
        <Text style={styles.typeIcon}>{meta.icon}</Text>
        <View>
          <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.timestamp}>{timeAgo(incident.timestamp)} · {new Date(incident.timestamp).toLocaleString()}</Text>
        </View>
      </View>

      {/* main card */}
      <View style={styles.card}>
        <Text style={styles.description}>{incident.description}</Text>

        <TrustBar score={incident.trustScore} />

        {/* verification stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{incident.verificationCount}</Text>
            <Text style={styles.statLabel}>Verifications</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{incident.upvotes}</Text>
            <Text style={styles.statLabel}>Upvotes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, incident.verified ? styles.statVerified : styles.statUnverified]}>
              {incident.verified ? '✓' : '○'}
            </Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
        </View>

        <View style={styles.credibilityCard}>
          <Text style={styles.credibilityTitle}>Reporter credibility</Text>
          <Text style={styles.credibilityValue}>{incident.reporterCredibilityScore}/100</Text>
          <Text style={styles.credibilityMeta}>
            {incident.verified ? 'Verified by community' : 'Awaiting community verification'}
          </Text>
        </View>
      </View>

      {/* actions */}
      <View style={styles.actions}>
        <AppButton
          label={upvoted ? `▲ Upvoted (${incident.upvotes + 1})` : `▲ Upvote (${incident.upvotes})`}
          variant="secondary"
          disabled={upvoted || actionLoading}
          loading={actionLoading && !upvoted}
          onPress={handleUpvote}
          style={styles.actionButton}
        />
        <AppButton
          label={verified ? '✓ Already verified' : 'Verify this report'}
          variant={verified ? 'secondary' : 'primary'}
          disabled={verified || actionLoading}
          loading={actionLoading && !verified}
          onPress={handleVerify}
          style={styles.actionButton}
        />
      </View>

      <Text style={styles.disclaimer}>
        Verifying confirms you witnessed or can corroborate this incident. Each user can verify once.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: 36,
  },
  typeHeader: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  typeIcon: {
    fontSize: 32,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  timestamp: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  card: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  description: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  statVerified: {
    color: theme.colors.success,
  },
  statUnverified: {
    color: theme.colors.muted,
  },
  statDivider: {
    backgroundColor: theme.colors.border,
    height: 36,
    width: 1,
  },
  actions: {
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  credibilityCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  credibilityTitle: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  credibilityValue: {
    color: theme.colors.info,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  credibilityMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  actionButton: {},
  disclaimer: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  // skeleton
  skeleton: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  skeletonTypePill: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: theme.radius.pill,
    height: 28,
    marginBottom: 16,
    width: '50%',
  },
  skeletonLine: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: 4,
    height: 14,
    marginBottom: 10,
    width: '95%',
  },
  skeletonShort: {
    width: '70%',
    marginBottom: 18,
  },
  skeletonBar: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: theme.radius.sm,
    height: 60,
  },
});
