import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, Region } from 'react-native-maps';

import { MapDetailSheet } from '../../components/map/MapDetailSheet';
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
import { clusterIncidents, inViewport } from '../../utils/mapCluster';
import { theme } from '../../utils/theme';

const defaultRegion = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export const SafetyMapScreen = () => {
  const dispatch = useAppDispatch();
  const reduxIncidents = useAppSelector((state) => state.incidents.items);
  const reduxActiveAlerts = useAppSelector((state) => state.sos.activeAlerts);
  const hotspots = useAppSelector((state) => state.hotspots.items);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [filters, setFilters] = useState<MapFilters>({ incidents: true, sos: true, roadblocks: true, hotspots: false });
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [guardians, setGuardians] = useState<NearbyGuardian[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState<NearbyGuardian | null>(null);
  const [routeComparison, setRouteComparison] = useState<RouteComparison | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const sheetTranslateY = useRef(new Animated.Value(220)).current;

  const animateSheet = (open: boolean) => {
    Animated.spring(sheetTranslateY, {
      damping: 22,
      mass: 0.9,
      stiffness: 130,
      toValue: open ? 0 : 220,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    dispatch(fetchNearbyIncidents({ latitude: defaultRegion.latitude, longitude: defaultRegion.longitude, radiusKm: 10 }));
    dispatch(fetchActiveAlerts());
    dispatch(fetchHotspots({ latitude: defaultRegion.latitude, longitude: defaultRegion.longitude, radiusKm: 10 }));
  }, [dispatch]);

  useEffect(() => {
    setIncidents(reduxIncidents);
  }, [reduxIncidents]);

  useEffect(() => {
    setActiveAlerts(reduxActiveAlerts);
  }, [reduxActiveAlerts]);

  useEffect(() => {
    let mounted = true;

    const resolveUserLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted' || !mounted) {
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!mounted) {
        return;
      }

      const nextRegion = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.09,
        longitudeDelta: 0.09,
      };

      setUserLocation({ latitude: nextRegion.latitude, longitude: nextRegion.longitude });
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    };

    resolveUserLocation().catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const off = setInterval(() => {
      dispatch(fetchNearbyIncidents({ latitude: region.latitude, longitude: region.longitude, radiusKm: 10 }));
      dispatch(fetchActiveAlerts());
      dispatch(fetchHotspots({ latitude: region.latitude, longitude: region.longitude, radiusKm: 10 }));

      guardianService
        .fetchNearbyGuardians(region.latitude, region.longitude, 2)
        .then((response) => setGuardians(response))
        .catch(() => undefined);
    }, 30000);

    return () => clearInterval(off);
  }, [dispatch, region.latitude, region.longitude]);

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
    guardianService
      .fetchNearbyGuardians(region.latitude, region.longitude, 2)
      .then((response) => setGuardians(response))
      .catch(() => undefined);
  }, [region.latitude, region.longitude]);

  const visibleIncidents = useMemo(() => {
    if (!filters.incidents) {
      return [];
    }

    const filtered = incidents.filter((incident) => {
      if (!filters.roadblocks && incident.type === 'ROADBLOCK') {
        return false;
      }

      return true;
    });

    const inView = filtered.filter((incident) =>
      inViewport(
        incident.location,
        { latitude: region.latitude, longitude: region.longitude },
        region.latitudeDelta * 1.4,
        region.longitudeDelta * 1.4
      )
    );

    return inView.slice(0, 220);
  }, [filters.incidents, filters.roadblocks, incidents, region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  const visibleAlerts = useMemo(() => {
    if (!filters.sos) {
      return [];
    }

    return activeAlerts
      .filter((alert) =>
        inViewport(
          alert.location,
          { latitude: region.latitude, longitude: region.longitude },
          region.latitudeDelta * 1.5,
          region.longitudeDelta * 1.5
        )
      )
      .slice(0, 140);
  }, [activeAlerts, filters.sos, region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  const clusters = useMemo(
    () =>
      clusterIncidents({
        incidents: visibleIncidents,
        activeAlerts: visibleAlerts,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      }).filter((entry) => entry.count > 2),
    [visibleIncidents, visibleAlerts, region.latitudeDelta, region.longitudeDelta]
  );

  const dangerHeatPoints = useMemo(
    () => [...visibleIncidents.map((entry) => entry.location), ...visibleAlerts.map((entry) => entry.location)].slice(0, 70),
    [visibleAlerts, visibleIncidents]
  );

  const distanceFromUser = useMemo(() => {
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

  const openIncident = (incident: Incident) => {
    setSelectedGuardian(null);
    setSelectedAlert(null);
    setSelectedIncident(incident);
    animateSheet(true);
  };

  const openAlert = (alert: SOSAlert) => {
    setSelectedGuardian(null);
    setSelectedIncident(null);
    setSelectedAlert(alert);
    animateSheet(true);
  };

  const openGuardian = (guardian: NearbyGuardian) => {
    setSelectedIncident(null);
    setSelectedAlert(null);
    setSelectedGuardian(guardian);
    animateSheet(true);
  };

  const onMapPress = () => {
    setSelectedGuardian(null);
    setSelectedAlert(null);
    setSelectedIncident(null);
    animateSheet(false);
  };

  const callTarget = selectedAlert?.requesterPhone ?? selectedGuardian?.phone;

  const onCallTarget = () => {
    if (!callTarget) {
      return;
    }

    Linking.openURL(`tel:${callTarget}`).catch(() => undefined);
  };

  const navigationTarget = selectedAlert?.location ?? selectedGuardian?.homeLocation;

  const onNavigateTarget = () => {
    if (!navigationTarget || !userLocation) {
      return;
    }

    setRouteLoading(true);

    routeService
      .compareRoutes(userLocation, navigationTarget, incidents)
      .then((comparison) => {
        setRouteComparison(comparison);
        setSelectedRoute(comparison.safest);
      })
      .finally(() => setRouteLoading(false));
  };

  const openExternalRoute = (route: RouteOption) => {
    const destination = route.polyline[route.polyline.length - 1];
    if (!destination) {
      return;
    }

    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}`,
      android: `google.navigation:q=${destination.latitude},${destination.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => undefined);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Safety map</Text>
        <Text style={styles.caption}>Real-time danger intelligence around your current area.</Text>
      </View>

      <MapFilterBar filters={filters} onChange={setFilters} />

      <RouteComparisonPanel
        comparison={routeComparison}
        selectedRouteId={selectedRoute?.id ?? null}
        loading={routeLoading}
        onSelect={(route) => setSelectedRoute(route)}
        onOpenExternal={(route) => openExternalRoute(route)}
      />

      <MapView
        ref={(ref) => {
          mapRef.current = ref;
        }}
        style={styles.map}
        initialRegion={defaultRegion}
        onRegionChangeComplete={(next) => {
          setRegion(next);
        }}
        onPress={onMapPress}
      >
        {dangerHeatPoints.map((point, index) => (
          <Circle
            key={`heat-${index}`}
            center={point}
            radius={220}
            strokeColor="rgba(229,57,53,0.1)"
            fillColor="rgba(229,57,53,0.16)"
          />
        ))}

        {filters.hotspots &&
          hotspots.map((hotspot, index) => {
            const risk = hotspot.riskScore;
            const color =
              risk >= 60
                ? { stroke: 'rgba(229,57,53,0.55)', fill: 'rgba(229,57,53,0.18)' }
                : risk >= 30
                  ? { stroke: 'rgba(249,168,37,0.55)', fill: 'rgba(249,168,37,0.18)' }
                  : { stroke: 'rgba(46,189,133,0.55)', fill: 'rgba(46,189,133,0.15)' };
            const radius = Math.max(350, hotspot.incidentCount * 180);
            return (
              <Circle
                key={`hotspot-${index}`}
                center={hotspot.center}
                radius={radius}
                strokeColor={color.stroke}
                strokeWidth={2}
                fillColor={color.fill}
              />
            );
          })}

        {routeComparison?.dangerZones.map((point, index) => (
          <Circle
            key={`route-danger-${index}`}
            center={point}
            radius={120}
            strokeColor="rgba(249,168,37,0.22)"
            fillColor="rgba(249,168,37,0.25)"
          />
        ))}

        {routeComparison ? (
          <Polyline
            coordinates={routeComparison.fastest.polyline}
            strokeColor="rgba(77,163,255,0.65)"
            strokeWidth={3}
          />
        ) : null}

        {routeComparison ? (
          <Polyline
            coordinates={routeComparison.safest.polyline}
            strokeColor={selectedRoute?.id === routeComparison.safest.id ? '#2EBD85' : 'rgba(46,189,133,0.6)'}
            strokeWidth={selectedRoute?.id === routeComparison.safest.id ? 5 : 4}
          />
        ) : null}

        {clusters.map((cluster) => (
          <Marker
            key={`cluster-${cluster.id}`}
            coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
            title={`${cluster.count} incidents nearby`}
            description="Clustered safety events"
            pinColor="#5E35B1"
          />
        ))}

        {visibleIncidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={incident.location}
            pinColor={incident.type === 'SUSPICIOUS_ACTIVITY' ? '#F9A825' : '#FB8C00'}
            title={incident.type.replace(/_/g, ' ')}
            description={incident.description}
            onPress={() => openIncident(incident)}
          />
        ))}

        {visibleAlerts.map((alert) => (
          <Marker
            key={alert.id}
            coordinate={alert.location}
            pinColor="#E53935"
            title="Active SOS"
            description={`Escalation level ${alert.escalationLevel}`}
            onPress={() => openAlert(alert)}
          />
        ))}

        {guardians
          .filter((guardian) => Boolean(guardian.homeLocation))
          .map((guardian) => (
            <Marker
              key={`guardian-${guardian.id}`}
              coordinate={guardian.homeLocation!}
              pinColor="#2EBD85"
              title={`Guardian · ${guardian.name}`}
              description={`Badge ${guardian.guardianVerificationBadge} · ${guardian.distanceKm.toFixed(2)}km`}
              onPress={() => openGuardian(guardian)}
            />
          ))}
      </MapView>

      <MapDetailSheet
        animatedTranslateY={sheetTranslateY}
        incident={selectedIncident}
        alert={selectedAlert}
        guardian={
          selectedGuardian
            ? {
                name: selectedGuardian.name,
                phone: selectedGuardian.phone,
                badge: selectedGuardian.guardianVerificationBadge,
                distanceKm: selectedGuardian.distanceKm,
              }
            : null
        }
        distanceKm={distanceFromUser}
        onCall={callTarget ? onCallTarget : undefined}
        onNavigate={navigationTarget ? onNavigateTarget : undefined}
      />
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
    marginBottom: 10,
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
  map: {
    borderRadius: theme.radius.lg,
    flex: 1,
    overflow: 'hidden',
  },
});
