import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { MapFilterBar, MapFilters } from '../../components/map/MapFilterBar';
import { RouteComparisonPanel } from '../../components/map/RouteComparisonPanel';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchHotspots } from '../../redux/slices/hotspotsSlice';
import { fetchNearbyIncidents } from '../../redux/slices/incidentsSlice';
import { fetchActiveAlerts } from '../../redux/slices/sosSlice';
import { subscribeSafetyLiveUpdates } from '../../services/firestoreLiveSafety';
import { guardianService } from '../../services/guardianService';
import { routeService, RouteComparison, RouteOption } from '../../services/routeService';
import { Incident, NearbyGuardian, SOSAlert } from '../../types';
import { distanceKm } from '../../utils/distance';
import { clusterIncidents } from '../../utils/mapCluster';
import { theme } from '../../utils/theme';

const defaultLocation = {
  latitude: 6.5244,
  longitude: 3.3792,
};

export const SafetyMapScreen = () => {
  const dispatch = useAppDispatch();
  const reduxIncidents = useAppSelector((state) => state.incidents.items);
  const reduxAlerts = useAppSelector((state) => state.sos.activeAlerts);
  const hotspots = useAppSelector((state) => state.hotspots.items);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
  const [filters, setFilters] = useState<MapFilters>({ incidents: true, sos: true, roadblocks: true, hotspots: false });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [guardians, setGuardians] = useState<NearbyGuardian[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState<NearbyGuardian | null>(null);
  const [routeComparison, setRouteComparison] = useState<RouteComparison | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchNearbyIncidents({ latitude: defaultLocation.latitude, longitude: defaultLocation.longitude, radiusKm: 10 }));
    dispatch(fetchActiveAlerts());
    dispatch(fetchHotspots({ latitude: defaultLocation.latitude, longitude: defaultLocation.longitude, radiusKm: 10 }));
  }, [dispatch]);

  useEffect(() => {
    setIncidents(reduxIncidents);
  }, [reduxIncidents]);

  useEffect(() => {
    setActiveAlerts(reduxAlerts);
  }, [reduxAlerts]);

  useEffect(() => {
    const off = setInterval(() => {
      dispatch(fetchNearbyIncidents({ latitude: defaultLocation.latitude, longitude: defaultLocation.longitude, radiusKm: 10 }));
      dispatch(fetchActiveAlerts());
      dispatch(fetchHotspots({ latitude: defaultLocation.latitude, longitude: defaultLocation.longitude, radiusKm: 10 }));

      guardianService
        .fetchNearbyGuardians(defaultLocation.latitude, defaultLocation.longitude, 2)
        .then((response) => setGuardians(response))
        .catch(() => undefined);
    }, 30000);
    return () => clearInterval(off);
  }, [dispatch]);

  useEffect(() => {
    guardianService
      .fetchNearbyGuardians(defaultLocation.latitude, defaultLocation.longitude, 2)
      .then((response) => setGuardians(response))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let unsub: () => void = () => undefined;

    subscribeSafetyLiveUpdates(
      (payload) => {
        if (payload.incidents) {
          setIncidents(payload.incidents);
        }

        if (payload.alerts) {
          setActiveAlerts(payload.alerts.filter((entry) => entry.status === 'active'));
        }
      },
      () => undefined
    ).then((dispose) => {
      unsub = dispose;
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let mounted = true;
    const detect = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted' || !mounted) {
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (mounted) {
        setUserLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      }
    };
    detect().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const visibleIncidents = useMemo(() => {
    if (!filters.incidents) {
      return [];
    }

    return incidents
      .filter((incident) => (filters.roadblocks ? true : incident.type !== 'ROADBLOCK'))
      .slice(0, 220);
  }, [filters.incidents, filters.roadblocks, incidents]);

  const visibleAlerts = useMemo(() => {
    if (!filters.sos) {
      return [];
    }

    return activeAlerts.slice(0, 120);
  }, [activeAlerts, filters.sos]);

  const clusters = useMemo(
    () =>
      clusterIncidents({
        incidents: visibleIncidents,
        activeAlerts: visibleAlerts,
        latitudeDelta: 0.13,
        longitudeDelta: 0.13,
      }),
    [visibleAlerts, visibleIncidents]
  );

  const dangerList = useMemo(
    () =>
      clusters
        .slice(0, 12)
        .sort((a, b) => b.count - a.count)
        .map((cluster) => ({
          id: cluster.id,
          score: cluster.count,
        })),
    [clusters]
  );

  const selectedDistance = useMemo(() => {
    if (!userLocation) {
      return null;
    }
    if (selectedIncident) {
      return distanceKm(userLocation, selectedIncident.location);
    }
    if (selectedAlert) {
      return distanceKm(userLocation, selectedAlert.location);
    }
    if (selectedGuardian?.homeLocation) {
      return distanceKm(userLocation, selectedGuardian.homeLocation);
    }
    return null;
  }, [selectedAlert, selectedGuardian, selectedIncident, userLocation]);

  const feedItems = useMemo(
    () => [
      ...visibleIncidents.map((incident) => ({ kind: 'incident' as const, id: incident.id, incident })),
      ...visibleAlerts.map((alert) => ({ kind: 'alert' as const, id: alert.id, alert })),
      ...guardians.map((guardian) => ({ kind: 'guardian' as const, id: `guardian-${guardian.id}`, guardian })),
    ],
    [guardians, visibleAlerts, visibleIncidents]
  );

  const callTarget = selectedAlert?.requesterPhone ?? selectedGuardian?.phone;
  const onCall = () => {
    if (callTarget) {
      Linking.openURL(`tel:${callTarget}`).catch(() => undefined);
    }
  };

  const destination = selectedAlert?.location ?? selectedGuardian?.homeLocation;
  const onNavigate = () => {
    if (!destination || !userLocation) {
      return;
    }

    setRouteLoading(true);

    routeService
      .compareRoutes(userLocation, destination, incidents)
      .then((comparison) => {
        setRouteComparison(comparison);
        setSelectedRoute(comparison.safest);
      })
      .finally(() => setRouteLoading(false));
  };

  const onOpenExternalRoute = (route: RouteOption) => {
    const destinationPoint = route.polyline[route.polyline.length - 1];
    if (!destinationPoint) {
      return;
    }

    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destinationPoint.latitude},${destinationPoint.longitude}`,
      android: `google.navigation:q=${destinationPoint.latitude},${destinationPoint.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destinationPoint.latitude},${destinationPoint.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => undefined);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Safety map</Text>
        <Text style={styles.caption}>Real-time live safety board (web-optimized mode).</Text>
      </View>

      <MapFilterBar filters={filters} onChange={setFilters} />

      <RouteComparisonPanel
        comparison={routeComparison}
        selectedRouteId={selectedRoute?.id ?? null}
        loading={routeLoading}
        onSelect={(route) => setSelectedRoute(route)}
        onOpenExternal={(route) => onOpenExternalRoute(route)}
      />

      <View style={styles.webFallback}>
        <Text style={styles.fallbackTitle}>Danger heat zones</Text>
        {dangerList.map((entry) => (
          <View key={entry.id} style={styles.heatRow}>
            <Text style={styles.fallbackText}>Zone {entry.id}</Text>
            <View style={styles.heatTrack}>
              <View style={[styles.heatFill, { width: `${Math.min(100, entry.score * 12)}%` }]} />
            </View>
          </View>
        ))}
        {filters.hotspots && hotspots.length > 0 ? (
          <View style={styles.hotspotSection}>
            <Text style={styles.hotspotSectionTitle}>Hotspot zones ({hotspots.length})</Text>
            {hotspots.slice(0, 8).map((hotspot, index) => {
              const riskLabel = hotspot.riskScore >= 60 ? 'HIGH' : hotspot.riskScore >= 30 ? 'MED' : 'LOW';
              const riskColor = hotspot.riskScore >= 60 ? '#FF5252' : hotspot.riskScore >= 30 ? '#F9A825' : '#2EBD85';
              const topType = Object.entries(hotspot.byType).sort((a, b) => b[1] - a[1])[0];
              return (
                <View key={`hs-${index}`} style={styles.hotspotRow}>
                  <View style={[styles.hotspotRiskBadge, { backgroundColor: `${riskColor}22`, borderColor: riskColor }]}>
                    <Text style={[styles.hotspotRiskText, { color: riskColor }]}>{riskLabel}</Text>
                  </View>
                  <View style={styles.hotspotMeta}>
                    <Text style={styles.hotspotCount}>{hotspot.incidentCount} incidents</Text>
                    {topType ? <Text style={styles.hotspotType}>{topType[0].replace(/_/g, ' ')}</Text> : null}
                  </View>
                  <Text style={styles.hotspotPeak}>{hotspot.peakHour ?? '—'}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {routeComparison ? (
          <View style={styles.routeSummaryWrap}>
            <Text style={styles.routeSummary}>Fastest: {routeComparison.fastest.durationMinutes.toFixed(0)} min · risk {routeComparison.fastest.risk.riskScore.toFixed(1)}</Text>
            <Text style={styles.routeSummary}>Safest: {routeComparison.safest.durationMinutes.toFixed(0)} min · risk {routeComparison.safest.risk.riskScore.toFixed(1)}</Text>
            <Text style={styles.routeSummary}>Danger zones on route: {routeComparison.dangerZones.length}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        style={styles.list}
        data={feedItems}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
        windowSize={5}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              if (item.kind === 'incident') {
                setSelectedGuardian(null);
                setSelectedAlert(null);
                setSelectedIncident(item.incident);
              } else if (item.kind === 'alert') {
                setSelectedGuardian(null);
                setSelectedIncident(null);
                setSelectedAlert(item.alert);
              } else {
                setSelectedIncident(null);
                setSelectedAlert(null);
                setSelectedGuardian(item.guardian);
              }
            }}
            style={styles.listCard}
          >
            <Text style={styles.cardTitle}>{item.kind === 'incident' ? item.incident.type.replace(/_/g, ' ') : item.kind === 'alert' ? 'Active SOS alert' : `Guardian ${item.guardian.name}`}</Text>
            <Text style={styles.cardBody} numberOfLines={2}>
              {item.kind === 'incident'
                ? item.incident.description
                : item.kind === 'alert'
                  ? `Escalation level ${item.alert.escalationLevel} · responders ${item.alert.responders.length}`
                  : `Badge ${item.guardian.guardianVerificationBadge} · ${item.guardian.distanceKm.toFixed(2)} km away`}
            </Text>
          </Pressable>
        )}
      />

      {(selectedIncident || selectedAlert || selectedGuardian) && (
        <View style={styles.bottomSheet}>
          <Text style={styles.cardTitle}>{selectedIncident ? selectedIncident.type.replace(/_/g, ' ') : selectedAlert ? 'Active SOS' : `Guardian ${selectedGuardian?.name ?? ''}`}</Text>
          <Text style={styles.cardBody}>{selectedIncident ? selectedIncident.description : selectedAlert ? 'Emergency alert in progress' : `Verified badge ${selectedGuardian?.guardianVerificationBadge ?? 'NONE'} · assists ${selectedGuardian?.guardianAssistCount ?? 0}`}</Text>
          {selectedDistance !== null ? <Text style={styles.fallbackText}>Distance: {selectedDistance.toFixed(2)} km</Text> : null}
          {callTarget ? (
            <Pressable onPress={onCall} style={styles.sheetActionBtn}>
              <Text style={styles.sheetActionText}>Call user</Text>
            </Pressable>
          ) : null}
          {destination ? (
            <Pressable onPress={onNavigate} style={styles.sheetActionBtnSecondary}>
              <Text style={styles.sheetActionText}>Navigate to location</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={styles.statsStrip}>
        <Text style={styles.statText}>Incidents: {visibleIncidents.length}</Text>
        <Text style={styles.statText}>SOS: {visibleAlerts.length}</Text>
        <Text style={styles.statText}>Guardians: {guardians.length}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    padding: theme.spacing.md,
  },
  headerCard: {
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: 8,
    padding: theme.spacing.sm,
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.h3,
    fontWeight: '800',
    marginBottom: 4,
  },
  caption: {
    color: theme.colors.muted,
  },
  webFallback: {
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: 10,
    padding: theme.spacing.md,
  },
  fallbackTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  fallbackText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  heatRow: {
    gap: 6,
    marginBottom: 8,
  },
  heatTrack: {
    backgroundColor: theme.colors.backgroundMuted,
    borderRadius: theme.radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  heatFill: {
    backgroundColor: theme.colors.danger,
    height: 6,
  },
  routeSummaryWrap: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  routeSummary: {
    color: theme.colors.info,
    fontSize: 12,
    marginBottom: 4,
  },
  list: {
    flex: 1,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: 8,
    padding: theme.spacing.sm,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardBody: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomSheet: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: 10,
    padding: theme.spacing.md,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  statText: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  sheetActionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sheetActionBtnSecondary: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sheetActionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  hotspotSection: {
    borderTopColor: theme.colors.borderStrong,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  hotspotSectionTitle: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  hotspotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  hotspotRiskBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hotspotRiskText: {
    fontSize: 10,
    fontWeight: '800',
  },
  hotspotMeta: {
    flex: 1,
  },
  hotspotCount: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  hotspotType: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  hotspotPeak: {
    color: theme.colors.muted,
    fontSize: 11,
  },
});
