import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { Incident, SOSAlert } from '../../types';
import { theme } from '../../utils/theme';

type Props = {
  animatedTranslateY: Animated.Value;
  incident: Incident | null;
  alert: SOSAlert | null;
  guardian?: { name: string; phone: string; badge: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD'; distanceKm: number } | null;
  distanceKm: number | null;
  onCall?: () => void;
  onNavigate?: () => void;
};

export const MapDetailSheet = ({ animatedTranslateY, incident, alert, guardian, distanceKm, onCall, onNavigate }: Props) => {
  if (!incident && !alert && !guardian) {
    return null;
  }

  const title = guardian ? `Guardian ${guardian.name}` : incident ? incident.type.replace(/_/g, ' ') : 'Active SOS';
  const body = guardian
    ? 'Community guardian is available to support nearby SOS requests.'
    : incident
      ? incident.description
      : 'Emergency SOS alert in progress.';

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: animatedTranslateY }] }]}>
      <View style={styles.handle} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {distanceKm !== null ? <Text style={styles.meta}>{distanceKm.toFixed(2)} km away</Text> : null}
      {guardian ? <Text style={styles.meta}>Verification badge: {guardian.badge}</Text> : null}
      {incident ? (
        <Text style={styles.meta}>
          Trust {incident.trustScore}/100 · Upvotes {incident.upvotes} · {incident.verified ? 'Verified by community' : 'Awaiting verification'}
        </Text>
      ) : null}
      {alert ? <Text style={styles.meta}>SOS escalation level {alert.escalationLevel} · responders {alert.responders.length}</Text> : null}
      {(alert || guardian) && onCall ? <AppButton label="Call user" variant="secondary" onPress={onCall} style={styles.actionBtn} /> : null}
      {(alert || guardian) && onNavigate ? <AppButton label="Navigate" onPress={onNavigate} style={styles.actionBtn} /> : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    ...theme.elevation.card,
    backgroundColor: theme.colors.cardStrong,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    bottom: 0,
    left: 0,
    padding: theme.spacing.md,
    position: 'absolute',
    right: 0,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: theme.colors.borderStrong,
    borderRadius: 999,
    height: 4,
    marginBottom: 10,
    width: 42,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 10,
  },
});
