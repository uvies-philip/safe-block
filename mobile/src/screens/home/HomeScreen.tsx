import React, { useCallback, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { LogoMark } from '../../components/branding/LogoMark';
import { SOSButton } from '../../components/SOSButton';
import { AppButton } from '../../components/ui/AppButton';
import { useToast } from '../../components/ui/AppToast';
import { useSOSWorkflow } from '../../hooks/useSOSWorkflow';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateGuardianProfile } from '../../redux/slices/authSlice';
import { guardianService } from '../../services/guardianService';
import { fetchNearbyIncidents } from '../../redux/slices/incidentsSlice';
import {
  beginSOSTrigger,
  clearSOSWarning,
  fetchActiveAlerts,
  fetchSOSStatus,
  respondToSOS,
} from '../../redux/slices/sosSlice';
import { Incident } from '../../types';
import { incidentMeta, timeAgo, trustColor, trustProgress } from '../../utils/format';
import { theme } from '../../utils/theme';

// ─── Mini incident card for Home feed ─────────────────────────────────────────

const IncidentFeedCard = ({ item, onPress }: { item: Incident; onPress: () => void }) => {
  const meta = incidentMeta(item.type);
  const tColor = trustColor(item.trustScore);
  const tProg = trustProgress(item.trustScore);
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.feedCard, pressed && styles.feedCardPressed]}
      onPress={onPress}
    >
      <View style={styles.feedCardTop}>
        <View style={[styles.feedTypePill, { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}55` }]}>
          <Text style={styles.feedTypeIcon}>{meta.icon}</Text>
          <Text style={[styles.feedTypeLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.feedTime}>{timeAgo(item.timestamp)}</Text>
      </View>
      <Text style={styles.feedDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.feedTrustRow}>
        <View style={styles.feedTrustTrack}>
          <View style={[styles.feedTrustFill, { width: `${tProg * 100}%`, backgroundColor: tColor }]} />
        </View>
        {item.verified && <Text style={styles.verifiedBadge}>✓</Text>}
        <Text style={styles.feedUpvotes}>▲ {item.upvotes}</Text>
      </View>
    </Pressable>
  );
};

// ─── Skeleton card ─────────────────────────────────────────────────────────────

const SkeletonFeedCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonPill} />
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, styles.skeletonShort]} />
  </View>
);

// ─── Responder chip ────────────────────────────────────────────────────────────

const ResponderChip = ({ status, eta }: { status: string; eta?: number }) => (
  <View style={[styles.responderChip, status === 'coming' ? styles.responderChipComing : styles.responderChipUnable]}>
    <Text style={styles.responderChipText}>
      {status === 'coming' ? `🏃 Coming${eta ? ` • ${eta}m` : ''}` : '✗ Unable'}
    </Text>
  </View>
);

// ─── Screen ────────────────────────────────────────────────────────────────────

export const HomeScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const incidents = useAppSelector((state) => state.incidents.items.slice(0, 6));
  const incidentsLoading = useAppSelector((state) => state.incidents.loading);
  const sosState = useAppSelector((state) => state.sos);
  const userId = useAppSelector((state) => state.auth.user?.id ?? '');
  const user = useAppSelector((state) => state.auth.user);
  const [guardianMode, setGuardianMode] = React.useState(Boolean(user?.guardianAvailable));
  const [guardianSyncing, setGuardianSyncing] = React.useState(false);

  useEffect(() => {
    setGuardianMode(Boolean(user?.guardianAvailable));
  }, [user?.guardianAvailable]);

  const { cancel } = useSOSWorkflow({
    dispatch,
    workflowStatus: sosState.workflowStatus,
    cancelSecondsLeft: sosState.cancelSecondsLeft,
  });

  const myActiveAlert =
    (sosState.activeAlert?.status === 'active' ? sosState.activeAlert : null) ??
    sosState.activeAlerts.find((e) => e.userId === userId && e.status === 'active') ??
    null;
  const nearbyAlerts = sosState.activeAlerts
    .filter((e) => e.userId !== userId && e.status === 'active')
    .slice(0, 2);

  const refresh = useCallback(() => {
    dispatch(fetchNearbyIncidents({ latitude: 6.5244, longitude: 3.3792, radiusKm: 10 }));
    dispatch(fetchActiveAlerts());
  }, [dispatch]);

  useEffect(() => { refresh(); }, [refresh]);

  // poll only while an active alert exists — saves battery/data
  useEffect(() => {
    if (!myActiveAlert) return;
    const interval = setInterval(() => {
      dispatch(fetchSOSStatus(myActiveAlert.id));
      dispatch(fetchActiveAlerts());
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch, myActiveAlert]);

  const totalActiveCount = sosState.activeAlerts.filter((e) => e.status === 'active').length;

  const toggleGuardianMode = async (value: boolean) => {
    setGuardianMode(value);
    setGuardianSyncing(true);

    try {
      const updated = await guardianService.setAvailability(value);
      dispatch(updateGuardianProfile(updated));
      showToast(value ? 'Guardian mode enabled. You can now receive nearby SOS alerts.' : 'Guardian mode disabled.', 'success');
    } catch {
      setGuardianMode(Boolean(user?.guardianAvailable));
      showToast('Unable to update guardian availability. Please try again.', 'error');
    } finally {
      setGuardianSyncing(false);
    }
  };

  useEffect(() => {
    if (!sosState.warning) {
      return;
    }

    const timeoutId = setTimeout(() => {
      dispatch(clearSOSWarning());
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [dispatch, sosState.warning]);

  return (
    <FlatList
      data={incidents}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          {/* ── Hero ────────────────────────────────── */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <LogoMark size={34} showWordmark={false} />
              <View style={styles.heroPulse}>
                <View style={[styles.pulseDot, totalActiveCount > 0 && styles.pulseDotActive]} />
                <Text style={styles.pulseText}>
                  {totalActiveCount > 0 ? `${totalActiveCount} alert${totalActiveCount !== 1 ? 's' : ''} active` : 'Area clear'}
                </Text>
              </View>
            </View>
            <Text style={styles.heading}>Neighborhood Pulse</Text>
            <Text style={styles.subheading}>Emergency actions and live safety updates.</Text>
          </View>

          {/* ── SOS button ──────────────────────────── */}
          <View style={styles.sosContainer}>
            <SOSButton
              onPress={() => dispatch(beginSOSTrigger())}
              loading={sosState.loading}
            />
          </View>

          {sosState.workflowStatus === 'triggered' ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>SOS armed</Text>
              <Text style={styles.pendingBody}>
                Sending in {sosState.cancelSecondsLeft}s. Cancel now if this was accidental.
              </Text>
              <AppButton label="Cancel SOS" variant="secondary" onPress={cancel} style={styles.pendingButton} />
            </View>
          ) : null}

          {sosState.workflowStatus === 'sending' ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>Sending SOS…</Text>
              <Text style={styles.pendingBody}>Dispatch in progress. It will retry automatically if internet is unavailable.</Text>
            </View>
          ) : null}

          {sosState.warning ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{sosState.warning}</Text>
            </View>
          ) : null}

          {sosState.error ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{sosState.error}</Text>
            </View>
          ) : null}

          <View style={styles.guardianCard}>
            <View style={styles.guardianHeader}>
              <Text style={styles.guardianTitle}>I'm Available to Help</Text>
              <Switch
                value={guardianMode}
                onValueChange={toggleGuardianMode}
                disabled={guardianSyncing}
                trackColor={{ false: theme.colors.borderStrong, true: `${theme.colors.success}66` }}
                thumbColor={guardianMode ? theme.colors.success : theme.colors.muted}
              />
            </View>
            <Text style={styles.guardianMeta}>
              {guardianMode
                ? `Guardian mode active · Badge ${(user?.guardianVerificationBadge ?? 'NONE').toLowerCase()}`
                : 'Enable to receive nearby SOS requests within 2km'}
            </Text>
          </View>

          {/* ── Quick actions ────────────────────────── */}
          <View style={styles.quickActionsRow}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => navigation.navigate('ReportIncident')}
            >
              <Text style={styles.actionIcon}>⚠</Text>
              <Text style={styles.actionLabel}>Report</Text>
              <Text style={styles.actionHint}>File incident</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => navigation.navigate('Map')}
            >
              <Text style={styles.actionIcon}>⌖</Text>
              <Text style={styles.actionLabel}>Map</Text>
              <Text style={styles.actionHint}>View hotspots</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => navigation.navigate('Contacts')}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionLabel}>Contacts</Text>
              <Text style={styles.actionHint}>Trusted people</Text>
            </Pressable>
          </View>

          {/* ── My active SOS ───────────────────────── */}
          {myActiveAlert ? (
            <View style={styles.mySOSCard}>
              <View style={styles.mySOSHeader}>
                <View style={styles.activeIndicator} />
                <Text style={styles.mySOSTitle}>Your SOS is active</Text>
                <Text style={styles.mySOSLevel}>Level {myActiveAlert.escalationLevel}</Text>
              </View>
              <Text style={styles.mySOSMeta}>
                Started {timeAgo(myActiveAlert.timestamp)} · {myActiveAlert.responders.length} responder{myActiveAlert.responders.length !== 1 ? 's' : ''}
              </Text>
              <View style={styles.respondersRow}>
                {myActiveAlert.responders.length === 0 ? (
                  <Text style={styles.mySOSHint}>Alerting your contacts… Escalation active.</Text>
                ) : (
                  myActiveAlert.responders.map((r) => (
                    <ResponderChip key={r.userId} status={r.status} eta={r.etaMinutes} />
                  ))
                )}
              </View>
              <AppButton
                label="Refresh status"
                variant="secondary"
                onPress={() => dispatch(fetchSOSStatus(myActiveAlert.id))}
                style={styles.refreshBtn}
              />
            </View>
          ) : null}

          {/* ── Nearby active SOS ───────────────────── */}
          {nearbyAlerts.length > 0 ? (
            <View style={styles.nearbySOSCard}>
              <Text style={styles.nearbySOSTitle}>🚨 Nearby SOS alerts</Text>
              {nearbyAlerts.map((alert) => (
                <View key={alert.id} style={styles.nearbySOSItem}>
                  <Text style={styles.nearbySOSMeta}>
                    Alert · {timeAgo(alert.timestamp)} · {alert.responders.length} responding
                  </Text>
                  <View style={styles.nearbyActions}>
                    <AppButton
                      label="I'm coming"
                      variant="primary"
                      onPress={async () => {
                        try {
                          await dispatch(respondToSOS({ alertId: alert.id, status: 'coming', etaMinutes: 8 })).unwrap();
                          dispatch(fetchActiveAlerts());
                          showToast('Response sent: marked as coming.', 'success');
                        } catch {
                          showToast('Could not send response. Please retry.', 'error');
                        }
                      }}
                      style={styles.nearbyActionBtn}
                    />
                    <AppButton
                      label="Unable"
                      variant="secondary"
                      onPress={async () => {
                        try {
                          await dispatch(respondToSOS({ alertId: alert.id, status: 'unable' })).unwrap();
                          dispatch(fetchActiveAlerts());
                          showToast('Response sent: marked as unable.', 'info');
                        } catch {
                          showToast('Could not send response. Please retry.', 'error');
                        }
                      }}
                      style={styles.nearbyActionBtn}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Incidents section header ─────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent incidents</Text>
            {incidents.length > 0 && (
              <Pressable onPress={() => navigation.navigate('Incidents')}>
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            )}
          </View>
        </>
      }
      renderItem={({ item }) =>
        incidentsLoading && incidents.length === 0 ? (
          <SkeletonFeedCard />
        ) : (
          <IncidentFeedCard
            item={item}
            onPress={() => navigation.navigate('IncidentDetails', { incidentId: item.id })}
          />
        )
      }
      ListEmptyComponent={
        incidentsLoading ? (
          <View>
            {[1, 2, 3].map((k) => <SkeletonFeedCard key={k} />)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>All clear nearby</Text>
            <Text style={styles.emptyBody}>No incidents reported in your area. Pull down to refresh.</Text>
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: 48,
  },
  // hero
  heroCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroPulse: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pulseDot: {
    backgroundColor: theme.colors.muted,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  pulseDotActive: {
    backgroundColor: theme.colors.danger,
  },
  pulseText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.h2,
    fontWeight: '800',
    lineHeight: 30,
  },
  subheading: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  // SOS
  sosContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pendingCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.warning,
    borderLeftWidth: 3,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  pendingTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  pendingBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  pendingButton: {
    marginTop: 12,
  },
  warningCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningText: {
    color: theme.colors.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  guardianCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  guardianHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  guardianTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  guardianMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  // quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  actionCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    color: theme.colors.secondarySoft,
    fontSize: 20,
    marginBottom: 6,
  },
  actionLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actionHint: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  // active SOS card
  mySOSCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.danger,
    borderLeftWidth: 3,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  mySOSHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  activeIndicator: {
    backgroundColor: theme.colors.danger,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  mySOSTitle: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  mySOSLevel: {
    backgroundColor: `${theme.colors.danger}22`,
    borderRadius: theme.radius.pill,
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mySOSMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  mySOSHint: {
    color: theme.colors.muted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  respondersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  refreshBtn: {
    marginTop: 12,
  },
  // responder chips
  responderChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  responderChipComing: {
    backgroundColor: `${theme.colors.success}18`,
    borderColor: theme.colors.success,
  },
  responderChipUnable: {
    backgroundColor: `${theme.colors.muted}18`,
    borderColor: theme.colors.muted,
  },
  responderChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  // nearby SOS
  nearbySOSCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.warning,
    borderLeftWidth: 3,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  nearbySOSTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  nearbySOSItem: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  nearbySOSMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  nearbyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  nearbyActionBtn: {
    flex: 1,
    minHeight: 44,
  },
  // section header
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.h3,
    fontWeight: '700',
  },
  seeAll: {
    color: theme.colors.secondarySoft,
    fontSize: 13,
    fontWeight: '700',
  },
  // feed cards
  feedCard: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  feedCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  feedCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedTypePill: {
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  feedTypeIcon: {
    fontSize: 12,
  },
  feedTypeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedTime: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  feedDesc: {
    color: theme.colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  feedTrustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  feedTrustTrack: {
    backgroundColor: theme.colors.trustBarBg,
    borderRadius: theme.radius.pill,
    flex: 1,
    height: 3,
    overflow: 'hidden',
  },
  feedTrustFill: {
    borderRadius: theme.radius.pill,
    height: 3,
  },
  verifiedBadge: {
    color: theme.colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  feedUpvotes: {
    color: theme.colors.muted,
    fontSize: 12,
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
    height: 20,
    marginBottom: 10,
    width: '38%',
  },
  skeletonLine: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: 4,
    height: 13,
    marginBottom: 7,
    width: '88%',
  },
  skeletonShort: {
    width: '60%',
    marginBottom: 0,
  },
  // empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
