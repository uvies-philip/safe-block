/**
 * Shared formatting utilities.
 * Kept pure (no imports) so they work in any context without bundle overhead.
 */

// ─── Incident metadata ────────────────────────────────────────────────────────

type IncidentMeta = { label: string; icon: string; color: string };

const INCIDENT_META: Record<string, IncidentMeta> = {
  ROBBERY: { label: 'Robbery', icon: '🔫', color: '#FF5252' },
  KIDNAPPING: { label: 'Kidnapping', icon: '🚨', color: '#D50000' },
  FIRE: { label: 'Fire', icon: '🔥', color: '#FF6D00' },
  POLICE_EXTORTION: { label: 'Police Extortion', icon: '🚔', color: '#FF9800' },
  ROADBLOCK: { label: 'Roadblock', icon: '🚧', color: '#F9A825' },
  ACCIDENT: { label: 'Accident', icon: '💥', color: '#FFB300' },
  SUSPICIOUS_ACTIVITY: { label: 'Suspicious Activity', icon: '👁', color: '#78909C' },
};

export const incidentMeta = (type: string): IncidentMeta =>
  INCIDENT_META[type] ?? { label: type.replace(/_/g, ' '), icon: '⚠', color: '#F9A825' };

// ─── Time formatting ──────────────────────────────────────────────────────────

export const timeAgo = (timestamp: string): string => {
  const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

// ─── Trust score helpers ──────────────────────────────────────────────────────

export const trustLabel = (score: number): string => {
  if (score >= 80) return 'High trust';
  if (score >= 55) return 'Moderate';
  return 'Unverified';
};

export const trustColor = (score: number): string => {
  if (score >= 80) return '#2EBD85';
  if (score >= 55) return '#F9A825';
  return '#78909C';
};

export const trustProgress = (score: number): number => Math.min(1, Math.max(0, score / 100));
