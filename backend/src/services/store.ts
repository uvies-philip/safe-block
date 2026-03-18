import { Incident, NotificationEvent, SOSAlert, TrustedContact, User } from '../models/types';

export const store = {
  users: [] as User[],
  contacts: [] as TrustedContact[],
  incidents: [] as Incident[],
  sosAlerts: [] as SOSAlert[],
  notificationEvents: [] as NotificationEvent[],
  refreshTokens: new Map<string, string>(),
};
