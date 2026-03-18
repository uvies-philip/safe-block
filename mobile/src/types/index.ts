export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl: string;
  homeLocation: Coordinates | null;
  trustedContacts: string[];
  guardianAvailable?: boolean;
  guardianVerificationBadge?: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
  guardianAssistCount?: number;
  createdAt: string;
};

export type TrustedContact = {
  id: string;
  userId: string;
  contactName: string;
  phone: string;
  relationship: string;
  createdAt: string;
};

export type IncidentType =
  | 'ROBBERY'
  | 'KIDNAPPING'
  | 'FIRE'
  | 'POLICE_EXTORTION'
  | 'ROADBLOCK'
  | 'ACCIDENT'
  | 'SUSPICIOUS_ACTIVITY';

export type Incident = {
  id: string;
  type: IncidentType;
  description: string;
  reportedBy: string;
  anonymous: boolean;
  imageUri?: string;
  location: Coordinates;
  timestamp: string;
  verified: boolean;
  upvotes: number;
  upvotedBy: string[];
  verificationCount: number;
  trustScore: number;
  reporterCredibilityScore: number;
  verifiedBy: string[];
};

export type PagedIncidentsResponse = {
  items: Incident[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type HotspotTimeOfDay = {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
};

export type Hotspot = {
  center: Coordinates;
  incidentCount: number;
  avgTrustScore: number;
  riskScore: number;
  byType: Partial<Record<IncidentType, number>>;
  timeOfDay: HotspotTimeOfDay;
  peakHour: string | null;
};

export type HotspotsResponse = {
  generatedAt: string;
  radiusKm: number;
  windowHours: number;
  gridSizeKm: number;
  hotspots: Hotspot[];
};

export type IncidentDraftStatus = 'pending' | 'syncing' | 'failed';

export type IncidentDraft = {
  draftId: string;
  type: IncidentType;
  description: string;
  anonymous: boolean;
  imageUri?: string;
  location: Coordinates;
  savedAt: string;
  status: IncidentDraftStatus;
  retryCount: number;
  lastError?: string;
};

export type SOSResponderStatus = 'coming' | 'unable';

export type SOSWorkflowStatus = 'idle' | 'triggered' | 'sending' | 'active' | 'resolved';

export type SOSResponder = {
  userId: string;
  status: SOSResponderStatus;
  etaMinutes?: number;
  updatedAt: string;
};

export type SOSAlert = {
  id: string;
  userId: string;
  requesterName?: string;
  requesterPhone?: string;
  location: Coordinates;
  timestamp: string;
  status: 'active' | 'resolved';
  escalationLevel: 1 | 2;
  responders: SOSResponder[];
};

export type NearbyGuardian = {
  id: string;
  name: string;
  phone: string;
  homeLocation: Coordinates | null;
  guardianAvailable: boolean;
  guardianVerificationBadge: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
  guardianAssistCount: number;
  distanceKm: number;
};

export type TriggerSOSResult = {
  alert: SOSAlert | null;
  queued: boolean;
  locationSource: 'gps' | 'lastKnown';
  notificationFailed: boolean;
  smsFailed: boolean;
  firestoreFailed: boolean;
  nearbyAlertFailed: boolean;
};
