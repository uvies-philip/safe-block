import bcrypt from 'bcryptjs';

import { Incident, IncidentType, SOSAlert, TrustedContact, User } from '../models/types';
import { createId } from './id';

const incidentTypes: IncidentType[] = ['ROBBERY', 'KIDNAPPING', 'FIRE', 'POLICE_EXTORTION', 'ROADBLOCK', 'ACCIDENT', 'SUSPICIOUS_ACTIVITY'];
const descriptions: Record<string, string[]> = {
  ROBBERY: [
    'Armed robbery reported near the bus stop in Lekki.',
    'Car break-in at residential complex.',
    'Store burglary overnight on Awolowo Road.',
  ],
  KIDNAPPING: [
    'Reports of suspicious abduction attempt.',
    'Person reported missing under unusual circumstances.',
    'Forced vehicle stop and possible abduction.',
  ],
  FIRE: [
    'Structure fire in commercial district.',
    'Vehicle fire on highway.',
    'Electrical fire in residential building.',
  ],
  POLICE_EXTORTION: [
    'Illegal checkpoint with suspicious money demands.',
    'Police harassment and extortion reported.',
    'Bribery demand at fake checkpoint.',
  ],
  ROADBLOCK: [
    'Multiple tyres and barricades blocking road.',
    'Illegal checkpoint setup on expressway.',
    'Heavy traffic due to roadblock.',
  ],
  ACCIDENT: [
    'Multi-vehicle collision on busy road.',
    'Motorcycle accident with injuries.',
    'Pedestrian hit near crossing.',
  ],
  SUSPICIOUS_ACTIVITY: [
    'Unusual activity at residence reported.',
    'Suspicious persons loitering in area.',
    'Suspicious vehicle parked overnight.',
  ],
};

export const generateSeedData = () => {
  const users: User[] = [];
  const incidents: Incident[] = [];
  const sosAlerts: SOSAlert[] = [];
  const dummyPassword = bcrypt.hashSync('password123', 10);
  const now = new Date();

  // Create seed users
  const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'];
  const userNames = ['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Eve Davis', 'Frank Wilson', 'Grace Lee', 'Henry Adams', 'Ivy Thomas', 'Jack Miller'];
  const userEmails = ['alice@example.com', 'bob@example.com', 'carol@example.com', 'david@example.com', 'eve@example.com', 'frank@example.com', 'grace@example.com', 'henry@example.com', 'ivy@example.com', 'jack@example.com'];
  const userPhones = ['08000000001', '08000000002', '08000000003', '08000000004', '08000000005', '08000000006', '08000000007', '08000000008', '08000000009', '08000000010'];

  // Random coordinates around Lekki/VI Lagos
  const baseLocations = [
    { latitude: 6.5244, longitude: 3.3792 }, // Lekki center
    { latitude: 6.5310, longitude: 3.3880 }, // Lekki Phase 1
    { latitude: 6.5150, longitude: 3.3650 }, // Lekki west
    { latitude: 6.5400, longitude: 3.4000 }, // Ikoyi
    { latitude: 6.5500, longitude: 3.3900 }, // Ikoyi south
    { latitude: 6.5075, longitude: 3.385 }, // Victoria Island
    { latitude: 6.495, longitude: 3.36 }, // Oniru
    { latitude: 6.57, longitude: 3.42 }, // Lekki-Ajah
    { latitude: 6.545, longitude: 3.36 }, // Banana Island axis
    { latitude: 6.52, longitude: 3.41 }, // Lekki conservation axis
  ];

  for (let i = 0; i < userIds.length; i++) {
    users.push({
      id: userIds[i],
      name: userNames[i],
      phone: userPhones[i],
      email: userEmails[i],
      photoUrl: '',
      passwordHash: dummyPassword,
      homeLocation: baseLocations[i],
      trustedContacts: [],
      guardianAvailable: i % 2 === 0, // Alternate guardian availability
      guardianVerificationBadge: i % 3 === 0 ? 'SILVER' : i % 2 === 0 ? 'BRONZE' : 'NONE',
      guardianAssistCount: i % 3 === 0 ? 12 : i % 2 === 0 ? 5 : 0,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Create incidents
  const incidentCount = 36;
  for (let i = 0; i < incidentCount; i++) {
    const type = incidentTypes[i % incidentTypes.length];
    const reportedBy = userIds[i % userIds.length];
    const desc = descriptions[type][i % descriptions[type].length];
    const timestamp = new Date(now.getTime() - (i + 1) * 45 * 60 * 1000); // Stagger over recent hours

    // Location variance around base location
    const baseIdx = i % baseLocations.length;
    const lat = baseLocations[baseIdx].latitude + (Math.random() - 0.5) * 0.02;
    const lng = baseLocations[baseIdx].longitude + (Math.random() - 0.5) * 0.02;

    incidents.push({
      id: createId(),
      type,
      description: desc,
      location: { latitude: lat, longitude: lng },
      timestamp: timestamp.toISOString(),
      reportedBy,
      anonymous: i % 5 === 0, // Some anonymous
      imageUri: i % 3 === 0 ? `https://cdn.example.com/incident-${i}.jpg` : undefined,
      trustScore: Math.floor(Math.random() * 100),
      upvotes: Math.floor(Math.random() * 15),
      upvotedBy: userIds.slice(0, Math.floor(Math.random() * 3)),
      verified: i % 4 === 0,
      verifiedBy: i % 4 === 0 ? [userIds[0]] : [],
      verificationCount: i % 4 === 0 ? 1 : 0,
      reporterCredibilityScore: Math.floor(Math.random() * 100),
    });
  }

  // Create some SOS alerts
  const sosCount = 8;
  for (let i = 0; i < sosCount; i++) {
    const userId = userIds[i];
    const location = baseLocations[i];
    const timestamp = new Date(now.getTime() - (i + 1) * 4 * 60 * 60 * 1000);

    sosAlerts.push({
      id: createId(),
      userId,
      requesterName: userNames[i],
      requesterPhone: userPhones[i],
      location,
      timestamp: timestamp.toISOString(),
      status: i < 3 ? 'active' : 'resolved',
      escalationLevel: i % 2 === 0 ? 2 : 1,
      responders: [
        {
          userId: userIds[(i + 1) % userIds.length],
          status: 'coming',
          etaMinutes: i === 0 ? 8 : 5,
          updatedAt: new Date(timestamp.getTime() + 30 * 1000).toISOString(),
        },
      ],
    });
  }

  return {
    users,
    incidents,
    sosAlerts,
    contacts: [] as TrustedContact[],
  };
};

