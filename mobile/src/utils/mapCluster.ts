import { Coordinates, Incident, SOSAlert } from '../types';

export type MapCluster = {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  incidentIds: string[];
};

type ClusterInput = {
  incidents: Incident[];
  activeAlerts: SOSAlert[];
  latitudeDelta: number;
  longitudeDelta: number;
};

const makeKey = (latitude: number, longitude: number, latStep: number, lonStep: number) => {
  const latKey = Math.floor(latitude / latStep);
  const lonKey = Math.floor(longitude / lonStep);
  return `${latKey}:${lonKey}`;
};

export const clusterIncidents = ({ incidents, activeAlerts, latitudeDelta, longitudeDelta }: ClusterInput): MapCluster[] => {
  const latStep = Math.max(0.005, latitudeDelta / 6);
  const lonStep = Math.max(0.005, longitudeDelta / 6);

  const map = new Map<string, { latSum: number; lonSum: number; count: number; ids: string[] }>();

  incidents.forEach((incident) => {
    const key = makeKey(incident.location.latitude, incident.location.longitude, latStep, lonStep);
    const existing = map.get(key) ?? { latSum: 0, lonSum: 0, count: 0, ids: [] };
    existing.latSum += incident.location.latitude;
    existing.lonSum += incident.location.longitude;
    existing.count += 1;
    existing.ids.push(incident.id);
    map.set(key, existing);
  });

  activeAlerts.forEach((alert) => {
    const key = makeKey(alert.location.latitude, alert.location.longitude, latStep, lonStep);
    const existing = map.get(key) ?? { latSum: 0, lonSum: 0, count: 0, ids: [] };
    existing.latSum += alert.location.latitude;
    existing.lonSum += alert.location.longitude;
    existing.count += 1;
    map.set(key, existing);
  });

  return Array.from(map.entries()).map(([key, value]) => ({
    id: key,
    latitude: value.latSum / value.count,
    longitude: value.lonSum / value.count,
    count: value.count,
    incidentIds: value.ids,
  }));
};

export const inViewport = (point: Coordinates, center: Coordinates, latitudeDelta: number, longitudeDelta: number) => {
  const latMin = center.latitude - latitudeDelta / 2;
  const latMax = center.latitude + latitudeDelta / 2;
  const lonMin = center.longitude - longitudeDelta / 2;
  const lonMax = center.longitude + longitudeDelta / 2;

  return point.latitude >= latMin && point.latitude <= latMax && point.longitude >= lonMin && point.longitude <= lonMax;
};
