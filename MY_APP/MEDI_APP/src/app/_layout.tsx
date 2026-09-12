import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ReasonFormModal } from '@/components/prescriptions/ReasonFormModal';
import { AlarmOverlay } from '@/components/common/AlarmOverlay';
import { fcmService } from '@/services/fcmService';
import { nativeNotificationService } from '@/services/nativeNotificationService';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Proactively request notification permission and sync FCM device token for web
      fcmService.autoSyncToken(true);
    } else {
      // Initialize native Android/iOS alarm channels, listeners, and token sync
      nativeNotificationService.initialize();
    }

    return () => {
      nativeNotificationService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Slot />
          <ReasonFormModal />
          <AlarmOverlay />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

