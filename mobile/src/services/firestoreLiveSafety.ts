import Constants from 'expo-constants';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, getFirestore, limit, onSnapshot, query } from 'firebase/firestore';

import { SOSAlert, Incident } from '../types';

type FirestoreConfig = {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
  storageBucket?: string;
};

type ListenerPayload = {
  incidents?: Incident[];
  alerts?: SOSAlert[];
};

const mapIncident = (doc: any): Incident => {
  const data = doc.data();
  return {
    id: doc.id,
    type: data.type,
    description: data.description,
    reportedBy: data.reportedBy ?? 'unknown',
    anonymous: Boolean(data.anonymous),
    imageUri: data.imageUri,
    location: data.location,
    timestamp: data.timestamp,
    verified: Boolean(data.verified),
    upvotes: Number(data.upvotes ?? 0),
    upvotedBy: Array.isArray(data.upvotedBy) ? data.upvotedBy : [],
    verificationCount: Number(data.verificationCount ?? 0),
    trustScore: Number(data.trustScore ?? 40),
    reporterCredibilityScore: Number(data.reporterCredibilityScore ?? 50),
    verifiedBy: Array.isArray(data.verifiedBy) ? data.verifiedBy : [],
  } as Incident;
};

const mapAlert = (doc: any): SOSAlert => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    location: data.location,
    timestamp: data.timestamp,
    status: data.status,
    escalationLevel: data.escalationLevel ?? 1,
    responders: Array.isArray(data.responders) ? data.responders : [],
  } as SOSAlert;
};

export const subscribeSafetyLiveUpdates = async (
  onData: (payload: ListenerPayload) => void,
  onError?: (error: Error) => void
) => {
  try {
    const config = (Constants.expoConfig?.extra?.firebaseConfig ?? null) as FirestoreConfig | null;

    if (!config) {
      throw new Error('FIREBASE_CONFIG_MISSING');
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    const db = getFirestore(app);

    const incidentQuery = query(collection(db, 'incidents'), limit(600));
    const sosQuery = query(collection(db, 'sosAlerts'), limit(300));

    const unsubIncidents = onSnapshot(
      incidentQuery,
      (snapshot) => {
        const incidents = snapshot.docs.map(mapIncident);
        onData({ incidents });
      },
      (error) => {
        onError?.(error as Error);
      }
    );

    const unsubAlerts = onSnapshot(
      sosQuery,
      (snapshot) => {
        const alerts = snapshot.docs.map(mapAlert);
        onData({ alerts });
      },
      (error) => {
        onError?.(error as Error);
      }
    );

    return () => {
      unsubIncidents();
      unsubAlerts();
    };
  } catch (error) {
    onError?.(error as Error);
    return () => undefined;
  }
};
