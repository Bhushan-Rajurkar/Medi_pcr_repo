import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, onMessage, Messaging } from 'firebase/messaging';
import { apiClient } from './api';
import { alarmService } from './alarmService';

const FCM_TOKEN_STORAGE_KEY = 'medi_pcr_fcm_token';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDYQhFuvRJvf-BROa-kHJ60T-wuzu55rso",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "my-medi-pcr.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "my-medi-pcr",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "my-medi-pcr.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "349132181939",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:349132181939:web:f46f0ea0600949990dbbc6",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-Q9RKBEZGSW"
};

const VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || "BDFx_L8uhZ710L6QkE-If5MbL3qpG_QxHT6dOy17Bm-URAKoyq9tO6jhRlKdFdxbErGXg8gj6lUwyXR7kgwQLVI";

class FcmService {
  private messaging: Messaging | null = null;
  private isForegroundListening: boolean = false;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.initFirebase();
      window.addEventListener('SYNC_FCM_TOKEN', () => {
        this.autoSyncToken(false);
      });
    }
  }

  private initFirebase(): void {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      if ('serviceWorker' in navigator) {
        this.messaging = getMessaging(app);
        this.setupForegroundListener();
      }
    } catch (e) {
      console.warn('Firebase initialization notice:', e);
    }
  }

  private setupForegroundListener(): void {
    if (!this.messaging || this.isForegroundListening) return;

    try {
      onMessage(this.messaging, async (payload) => {
        console.log('[fcmService] Foreground push notification received:', payload);

        const rawData = payload.data || {};
        const type = rawData.type || '';
        const medicineNames = rawData.medicineNames || '';
        const count = parseInt(rawData.count || '1', 10);
        const scheduledTime = rawData.scheduledTime || '';
        const title =
          payload.notification?.title ||
          rawData.title ||
          (count > 1 ? `💊 Medicine Reminder (${count} medicines)` : '💊 Medicine Reminder');
        const body =
          payload.notification?.body ||
          rawData.body ||
          'Time to take your scheduled medicine.';

        const rIds = rawData.reminderIds
          ? (typeof rawData.reminderIds === 'string' ? rawData.reminderIds.split(',') : rawData.reminderIds)
          : (rawData.reminderId ? [rawData.reminderId] : []);
        const mIds = rawData.medicineIds
          ? (typeof rawData.medicineIds === 'string' ? rawData.medicineIds.split(',') : rawData.medicineIds)
          : [];
        const mNames = medicineNames ? medicineNames.split(', ') : [];

        // 1. Ring the reminder audio in the open web tab as soon as message arrives
        alarmService.startAlarm({
          reminderId: rawData.reminderId || rawData.id,
          reminderIds: rIds,
          medicineIds: mIds,
          medicineNames: mNames,
          foodInstruction: rawData.foodInstruction,
          count: count,
          scheduledTime: scheduledTime,
          title: title,
          body: body,
          receivedAt: Date.now(),
        });

        // 2. CRITICAL: In web browsers, foreground push messages do not show banners automatically.
        // We explicitly trigger reg.showNotification() so device notification banners appear in
        // Windows Notification Center / Action Center and the device notification drawer!
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              // Notification 1: Medicine Details
              reg.showNotification(title, {
                body: body,
                icon: '/firebase-logo.png',
                badge: '/firebase-logo.png',
                tag: 'medi-pcr-details-' + Date.now(),
                renotify: true,
                requireInteraction: false,
                vibrate: [300, 100, 300],
                data: rawData,
                actions: [
                  { action: 'postpone', title: '⏳ Postpone' },
                  { action: 'dismiss', title: '✕ Missed' },
                ],
              } as any);

              // Notification 2: MediStatus 1-click Actions (Houses ✓ Taken & ⏰ Snooze)
              reg.showNotification('📋 Update MediStatus: Did you take your medicine?', {
                body: 'Tap a button below to update status directly:',
                icon: '/firebase-logo.png',
                badge: '/firebase-logo.png',
                tag: 'medi-pcr-actions-' + Date.now(),
                renotify: true,
                requireInteraction: true,
                vibrate: [500, 250, 500],
                data: rawData,
                actions: [
                  { action: 'taken', title: count > 1 ? `✓ Taken (${count})` : '✓ Taken' },
                  { action: 'snooze', title: '⏰ Snooze (5m)' },
                ],
              } as any);
            }
          } catch (notifErr) {
            console.warn('[fcmService] Notice showing foreground device notification:', notifErr);
          }
        }
      });
      this.isForegroundListening = true;
    } catch (e) {
      console.warn('Error setting up onMessage listener:', e);
    }
  }

  /**
   * Main function called when user clicks "Enable Reminders"
   * Registers Service Worker, requests notification permission, gets FCM token,
   * and sends it to the Spring Boot backend.
   */
  public async enableReminders(forceRefresh: boolean = false): Promise<{ token: string; message: string }> {
    if (typeof window === 'undefined') {
      throw new Error('Push notifications are currently supported on web browsers.');
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker is not supported in this browser.');
    }

    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported in this browser.');
    }

    // 1. Register Service Worker
    console.log('[fcmService] Registering /firebase-messaging-sw.js...');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    try {
      await registration.update();
    } catch (_) {}
    console.log('[fcmService] Service Worker registered and updated successfully:', registration);

    // 2. Request Notification Permission
    let permission = Notification.permission;
    if (permission === 'denied') {
      throw new Error('Notification permission is blocked by your browser. Please click the site settings / lock icon in your address bar, set Notifications to "Allow", and try again.');
    }

    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
      console.log('[fcmService] Notification permission status after request:', permission);
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted. Please allow notifications in your browser settings.');
    }

    // 3. Initialize messaging if not yet done
    if (!this.messaging) {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      this.messaging = getMessaging(app);
      this.setupForegroundListener();
    }

    // 4. If forceRefresh is requested, delete old token from browser storage to ensure Firebase issues a fresh token
    if (forceRefresh && this.messaging) {
      try {
        console.log('[fcmService] Deleting old cached FCM token to prevent NotRegistered reuse...');
        await deleteToken(this.messaging);
        console.log('[fcmService] Old token deleted successfully.');
      } catch (delErr) {
        console.warn('[fcmService] Notice deleting old token:', delErr);
      }
    }

    // 5. Get fresh FCM Token
    console.log('[fcmService] Requesting FCM token with VAPID key...');
    const token = await getToken(this.messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error('Failed to generate FCM token from Firebase.');
    }

    console.log('====================================');
    console.log('FCM TOKEN GENERATED:');
    console.log(token);
    console.log('====================================');

    // Store token in local storage
    try {
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
    } catch (e) {
      // ignore
    }

    // Retrieve logged-in user email or ID if present
    let userEmail: string | undefined;
    let userId: number | undefined;
    try {
      const storedUser =
        localStorage.getItem('medi_pcr_user_data') ||
        localStorage.getItem('user_profile') ||
        localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        userEmail = u.email;
        userId = u.id;
      }
    } catch (e) {}

    const syncPayload = { fcmToken: token, userEmail, userId };

    // 5. Send token to Spring Boot backend API
    if (userEmail || userId || apiClient.getToken()) {
      try {
        await apiClient.post('/reminders/fcm-token', syncPayload);
        console.log('[fcmService] Token successfully synchronized with backend /reminders/fcm-token');
      } catch (fallbackErr) {
        console.warn('Backend /reminders/fcm-token notice:', fallbackErr);
      }
    }

    if (apiClient.getToken()) {
      try {
        await apiClient.post('/auth/fcm-token', syncPayload);
        console.log('[fcmService] Token successfully synchronized with backend /auth/fcm-token');
      } catch (authErr) {
        console.warn('Syncing with /auth/fcm-token notice:', authErr);
      }
    }

    return {
      token,
      message: 'Device push notifications enabled and synchronized!',
    };
  }

  /**
   * Helper to synchronize any native or web push token directly with backend endpoints
   */
  public async saveDeviceTokenToBackend(token: string): Promise<void> {
    let userEmail: string | undefined;
    let userId: number | undefined;
    try {
      if (typeof localStorage !== 'undefined') {
        const storedUser =
          localStorage.getItem('medi_pcr_user_data') ||
          localStorage.getItem('user_profile') ||
          localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          userEmail = u.email;
          userId = u.id;
        }
      }
    } catch (e) {}

    const syncPayload = { fcmToken: token, userEmail, userId };

    try {
      await apiClient.post('/reminders/fcm-token', syncPayload);
      console.log('[fcmService] Device token synchronized with /reminders/fcm-token');
    } catch (err) {
      console.warn('Backend /reminders/fcm-token error:', err);
    }

    try {
      await apiClient.post('/auth/fcm-token', syncPayload);
      console.log('[fcmService] Device token synchronized with /auth/fcm-token');
    } catch (err) {
      console.warn('Backend /auth/fcm-token error:', err);
    }
  }

  /**
   * Automatically refreshes and syncs the FCM token on app load if permission is already granted.
   * This guarantees that if a token expires or service worker changes, the backend always receives the fresh token.
   */
  public async autoSyncToken(promptIfDefault: boolean = false): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted' || (promptIfDefault && Notification.permission === 'default')) {
      try {
        console.log('🔄 [fcmService] Syncing fresh FCM token on device...');
        await this.enableReminders();
      } catch (err) {
        console.warn('[fcmService] Auto-sync token attempt notice:', err);
      }
    }
  }

  /**
   * Direct trigger to send a test push notification to this device right now
   */
  public async triggerTestNotification(): Promise<any> {
    const token = this.getStoredToken();
    return await apiClient.post('/reminders/trigger-test?forceAll=true', { fcmToken: token });
  }

  public getStoredToken(): string | null {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
        if (stored && stored.trim()) return stored.trim();

        // Also check cached user profile if available
        const storedUser =
          localStorage.getItem('medi_pcr_user_data') ||
          localStorage.getItem('user_profile') ||
          localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          if (u.fcmToken && typeof u.fcmToken === 'string' && u.fcmToken.trim()) {
            return u.fcmToken.trim();
          }
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  public hasStoredToken(): boolean {
    return !!this.getStoredToken();
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }

  public isPermissionGranted(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  public isPermissionDenied(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'denied';
    }
    return false;
  }
}

export const fcmService = new FcmService();
