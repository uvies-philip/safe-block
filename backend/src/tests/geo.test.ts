import { distanceInKilometers } from '../utils/geo';

describe('distanceInKilometers', () => {
  it('returns zero for the same coordinates', () => {
    expect(distanceInKilometers({ latitude: 6.5244, longitude: 3.3792 }, { latitude: 6.5244, longitude: 3.3792 })).toBe(0);
  });

  it('returns a short distance for nearby coordinates', () => {
    const result = distanceInKilometers(
      { latitude: 6.5244, longitude: 3.3792 },
      { latitude: 6.531, longitude: 3.388 }
    );

    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(2);
  });
});
