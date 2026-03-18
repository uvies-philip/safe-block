import React, { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from 'react-native';

import { theme } from '../../utils/theme';

type ScreenContainerProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>;

export const ScreenContainer = ({ children, scroll = false, contentStyle }: ScreenContainerProps) => {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={[styles.safeArea, contentStyle]}>{children}</SafeAreaView>;
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
});
