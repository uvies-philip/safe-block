import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../utils/theme';

type LogoMarkProps = {
  size?: number;
  showWordmark?: boolean;
};

export const LogoMark = ({ size = 64, showWordmark = true }: LogoMarkProps) => {
  const badgeSize = size;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}> 
        <Text style={[styles.badgeText, { fontSize: badgeSize * 0.46 }]}>S</Text>
      </View>
      {showWordmark ? (
        <View>
          <Text style={styles.wordmark}>SafeBlock</Text>
          <Text style={styles.tagline}>Community safety network</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderColor: '#FFB3B0',
    borderWidth: 2,
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.text,
    fontWeight: '900',
    marginTop: -2,
  },
  wordmark: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  tagline: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    marginTop: 2,
  },
});
