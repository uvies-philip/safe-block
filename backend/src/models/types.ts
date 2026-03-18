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
  passwordHash: string;
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

export type SOSResponderStatus = 'coming' | 'unable';

export type SOSResponder = {
  userId: string;
  status: SOSResponderStatus;
  etaMinutes?: number;
  updatedAt: string;
};

export type SOSStatus = 'active' | 'resolved';

export type SOSAlert = {
  id: string;
  userId: string;
  requesterName?: string;
  requesterPhone?: string;
  location: Coordinates;
  timestamp: string;
  status: SOSStatus;
  escalationLevel: 1 | 2;
  responders: SOSResponder[];
};

export type NotificationEvent = {
  id: string;
  recipientUserIds: string[];
  category: 'SOS' | 'INCIDENT';
  message: string;
  createdAt: string;
  metadata: Record<string, string>;
  status: 'queued' | 'retrying' | 'delivered' | 'failed';
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  lastError?: string;
};

export type PublicUser = Omit<User, 'passwordHash'>;
