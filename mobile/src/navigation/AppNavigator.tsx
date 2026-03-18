import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSelector } from '../redux/hooks';
import { AddContactScreen } from '../screens/contacts/AddContactScreen';
import { TrustedContactsScreen } from '../screens/contacts/TrustedContactsScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { SafetyMapScreen } from '../screens/map/SafetyMapScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { IncidentDetailsScreen } from '../screens/report/IncidentDetailsScreen';
import { IncidentFeedScreen } from '../screens/report/IncidentFeedScreen';
import { ReportIncidentScreen } from '../screens/report/ReportIncidentScreen';
import { theme } from '../utils/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.backgroundSoft },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundSoft,
          borderTopColor: theme.colors.borderStrong,
          height: 78 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        },
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: {
          justifyContent: 'center',
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Home'
              ? 'home'
              : route.name === 'Map'
                ? 'map'
                : route.name === 'Incidents'
                  ? 'warning'
                  : 'people';

          return <Ionicons name={iconName} size={Math.max(18, size)} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 14, fontWeight: '700', marginBottom: 0, paddingBottom: 0 },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Map" component={SafetyMapScreen} options={{ title: 'Safety Map' }} />
      <Tab.Screen name="Incidents" component={IncidentFeedScreen} options={{ title: 'Incidents' }} />
      <Tab.Screen name="Contacts" component={TrustedContactsScreen} options={{ title: 'Contacts' }} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          primary: theme.colors.primary,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.backgroundSoft },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} options={{ title: 'Report Incident' }} />
            <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} options={{ title: 'Incident Details' }} />
            <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: 'Add Trusted Contact' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
