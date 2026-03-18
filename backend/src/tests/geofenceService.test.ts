import { geofenceService } from '../services/geofenceService';
import { store } from '../services/store';

describe('geofenceService', () => {
  beforeEach(() => {
    store.users.length = 0;
  });

  it('returns only users within a radius and excludes users without location', () => {
    store.users.push(
      {
        id: 'user-near',
        name: 'Near User',
        phone: '08000000001',
        email: 'near@example.com',
        photoUrl: '',
        passwordHash: 'hash',
        homeLocation: { latitude: 6.5244, longitude: 3.3792 },
        trustedContacts: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-far',
        name: 'Far User',
        phone: '08000000002',
        email: 'far@example.com',
        photoUrl: '',
        passwordHash: 'hash',
        homeLocation: { latitude: 7.3775, longitude: 3.947 },
        trustedContacts: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-no-home',
        name: 'No Home User',
        phone: '08000000003',
        email: 'nohome@example.com',
        photoUrl: '',
        passwordHash: 'hash',
        homeLocation: null,
        trustedContacts: [],
        createdAt: new Date().toISOString(),
      }
    );

    const result = geofenceService.getUsersWithinRadius({ latitude: 6.5244, longitude: 3.3792 }, 5);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('user-near');
    expect(result.some((user) => user.id === 'user-no-home')).toBe(false);
  });

  it('returns empty result when user store is empty', () => {
    const result = geofenceService.getUsersWithinRadius({ latitude: 6.5244, longitude: 3.3792 }, 5);
    expect(result).toEqual([]);
  });

  it('includes user when radius is widened from too-tight threshold', () => {
    store.users.push({
      id: 'user-boundary',
      name: 'Boundary User',
      phone: '08000000004',
      email: 'boundary@example.com',
      photoUrl: '',
      passwordHash: 'hash',
      homeLocation: { latitude: 6.5244, longitude: 3.39 },
      trustedContacts: [],
      createdAt: new Date().toISOString(),
    });

    const tight = geofenceService.getUsersWithinRadius({ latitude: 6.5244, longitude: 3.3792 }, 1);
    const wider = geofenceService.getUsersWithinRadius({ latitude: 6.5244, longitude: 3.3792 }, 2);

    expect(tight).toHaveLength(0);
    expect(wider).toHaveLength(1);
    expect(wider[0]?.id).toBe('user-boundary');
  });
});
