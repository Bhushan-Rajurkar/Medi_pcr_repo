import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { alarmService } from './alarmService';
import { fcmService } from './fcmService';
import { notifeeNotificationService } from './notifeeNotificationService';

export const ALARM_CHANNEL_ID = 'medicine-reminder-alarm';

export const isExpoGo =
  isRunningInExpoGo() ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

let notificationsModule: any = null;
async function getNotifications() {
  if (Platform.OS === 'web' || isExpoGo) return null;
  if (notificationsModule) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch (err) {
    return null;
  }
}

class NativeNotificationService {
  private isInitialized = false;
  private notificationListenerSubscription: any = null;
  private responseListenerSubscription: any = null;

  /**
   * Initializes native Android notification channels, handlers, and listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // In web or Expo Go (SDK 53+), native remote notification handlers are not available.
    // In Expo Go, the app relies on the responsive in-app AlarmOverlay.
    if (Platform.OS === 'web' || isExpoGo) {
      console.log('ℹ️ [NativeNotificationService] Running in Expo Go / Web; using in-app alarm overlay.');
      return;
    }

    try {
      const Notifications = await getNotifications();
      if (!Notifications) return;

      // 0. Initialize Notifee high-priority channel
      await notifeeNotificationService.init();

      // 1. Configure foreground notification presentation handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: Notifications.AndroidNotificationPriority?.MAX || 5,
        }),
      });

      // 2. Configure Android high-importance notification channel with alarm behavior
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
          name: 'Medicine Reminder Alarm',
          description: 'High-priority sound alarms and reminders for scheduled patient medications',
          importance: Notifications.AndroidImportance?.MAX || 5,
          vibrationPattern: [0, 500, 250, 500, 250, 500],
          lightColor: '#208AEF',
          enableLights: true,
          enableVibrate: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC || 1,
          sound: 'default',
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage?.ALARM || 4,
            contentType: Notifications.AndroidAudioContentType?.SONIFICATION || 4,
          },
        });

        // Register interactive notification action categories
        await Notifications.setNotificationCategoryAsync('MEDICINE_ACTIONS', [
          {
            identifier: 'taken',
            buttonTitle: '✓ Taken',
            options: { opensAppToForeground: false },
          },
          {
            identifier: 'snooze',
            buttonTitle: '⏰ Snooze (5m)',
            options: { opensAppToForeground: false },
          },
          {
            identifier: 'postpone',
            buttonTitle: '⏳ Postpone',
            options: { opensAppToForeground: false },
          },
          {
            identifier: 'dismiss',
            buttonTitle: '✕ Missed',
            options: { opensAppToForeground: false },
          },
        ]);
      }

      // 3. Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
          android: {},
        });
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        console.log('✅ [NativeNotificationService] Notification permissions granted.');
        await this.syncNativePushToken();
      } else {
        console.warn('⚠️ [NativeNotificationService] Notification permissions not granted:', finalStatus);
      }

      // 4. Listen for notifications received while app is foregrounded
      this.notificationListenerSubscription = Notifications.addNotificationReceivedListener(
        (notification: any) => {
          console.log('🔔 [NativeNotificationService] Notification received in foreground:', notification);
          const data = (notification?.request?.content?.data || {}) as Record<string, any>;
          const reminderId = data.reminderId ? String(data.reminderId) : (data.id ? String(data.id) : undefined);
          const reminderIds: string[] = data.reminderIds
            ? (typeof data.reminderIds === 'string'
              ? data.reminderIds.split(',')
              : Array.isArray(data.reminderIds) ? data.reminderIds.map(String) : [])
            : (reminderId ? [reminderId] : []);
          const medicineIds: string[] = data.medicineIds
            ? (typeof data.medicineIds === 'string'
              ? data.medicineIds.split(',')
              : Array.isArray(data.medicineIds) ? data.medicineIds.map(String) : [])
            : [];
          const medicineNames: string[] = data.medicineNames
            ? (typeof data.medicineNames === 'string'
              ? data.medicineNames.split(', ')
              : Array.isArray(data.medicineNames) ? data.medicineNames.map(String) : [])
            : [];

          alarmService.startAlarm({
            reminderId: reminderId,
            reminderIds: reminderIds,
            medicineIds: medicineIds,
            medicineNames: medicineNames,
            foodInstruction: data.foodInstruction ? String(data.foodInstruction) : undefined,
            count: Number(data.count) || 1,
            scheduledTime: data.scheduledTime ? String(data.scheduledTime) : undefined,
            title: notification?.request?.content?.title || '💊 Medicine Reminder',
            body: notification?.request?.content?.body || '',
            receivedAt: Date.now(),
          });
        }
      );

      // 5. Listen for user taps and notification action button interactions
      this.responseListenerSubscription = Notifications.addNotificationResponseReceivedListener(
        async (response: any) => {
          const actionId = response?.actionIdentifier;
          console.log('👆 [NativeNotificationService] User interacted with notification action:', actionId);

          if (actionId === 'taken' || actionId === 'snooze' || actionId === 'postpone' || actionId === 'dismiss') {
            await alarmService.handleAction(actionId);
          } else {
            // Default tap on the notification body: stop alarm audio and bring app up
            await alarmService.stopAlarm();
          }
        }
      );
    } catch (err) {
      console.warn('⚠️ [NativeNotificationService] Initialization error:', err);
    }
  }

  /**
   * Retrieves native device push token and syncs with backend
   */
  async syncNativePushToken(): Promise<string | null> {
    if (Platform.OS === 'web' || isExpoGo) return null;

    const Notifications = await getNotifications();
    if (!Notifications) return null;

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const token = tokenData?.data;
      if (token) {
        console.log('📱 [NativeNotificationService] Native Device Push Token retrieved:', token);
        await fcmService.saveDeviceTokenToBackend(token);
        return token;
      }
    } catch (e) {
      console.log('ℹ️ [NativeNotificationService] getDevicePushTokenAsync note:', e);
      try {
        // Fallback to Expo push token if FCM direct device token is unavailable
        const expoTokenData = await Notifications.getExpoPushTokenAsync();
        const expoToken = expoTokenData?.data;
        if (expoToken) {
          console.log('📱 [NativeNotificationService] Expo Push Token retrieved:', expoToken);
          await fcmService.saveDeviceTokenToBackend(expoToken);
          return expoToken;
        }
      } catch (err) {
        console.warn('⚠️ [NativeNotificationService] Failed to retrieve push token:', err);
      }
    }
    return null;
  }

  /**
   * Schedules a local exact Android alarm for offline reliability.
   */
  async scheduleLocalExactAlarm(params: {
    id: string;
    medicineName: string;
    hour: number;
    minute: number;
    foodInstruction?: string;
  }): Promise<string | null> {
    if (Platform.OS === 'web' || isExpoGo) return null;

    const Notifications = await getNotifications();
    if (!Notifications) return null;

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        identifier: `alarm_${params.id}_${params.hour}_${params.minute}`,
        content: {
          title: `💊 Time to take ${params.medicineName}`,
          body: `Instruction: ${params.foodInstruction || 'General'}. Tap to record status.`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority?.MAX || 5,
          categoryIdentifier: 'MEDICINE_ACTIONS',
          data: {
            medicineId: params.id,
            medicineNames: [params.medicineName],
            foodInstruction: params.foodInstruction,
            scheduledTime: `${String(params.hour).padStart(2, '0')}:${String(params.minute).padStart(2, '0')}`,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DAILY || 'daily',
          hour: params.hour,
          minute: params.minute,
          channelId: ALARM_CHANNEL_ID,
        },
      });

      console.log(`⏰ [NativeNotificationService] Scheduled local exact alarm: ${identifier} for ${params.hour}:${params.minute}`);
      return identifier;
    } catch (err) {
      console.warn('⚠️ [NativeNotificationService] Failed to schedule local alarm:', err);
      return null;
    }
  }

  /**
   * Cancels all scheduled local alarms
   */
  async cancelAllLocalAlarms(): Promise<void> {
    if (Platform.OS === 'web' || isExpoGo) return;

    const Notifications = await getNotifications();
    if (!Notifications) return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🧹 [NativeNotificationService] All local alarms cancelled.');
    } catch (e) {
      console.warn('⚠️ [NativeNotificationService] Failed to cancel local alarms:', e);
    }
  }

  cleanup(): void {
    if (this.notificationListenerSubscription) {
      this.notificationListenerSubscription.remove();
      this.notificationListenerSubscription = null;
    }
    if (this.responseListenerSubscription) {
      this.responseListenerSubscription.remove();
      this.responseListenerSubscription = null;
    }
    this.isInitialized = false;
  }
}

export const nativeNotificationService = new NativeNotificationService();
