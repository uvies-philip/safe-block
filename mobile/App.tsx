import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppSplash } from './src/components/branding/AppSplash';
import { ToastProvider } from './src/components/ui/AppToast';
import { AppNavigator } from './src/navigation/AppNavigator';
import { store } from './src/redux/store';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="light" />
          {splashDone ? <AppNavigator /> : <AppSplash onReady={() => setSplashDone(true)} />}
        </ToastProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
