import { Platform, NativeModules } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { apiClient } from './api';

export const NOTIFEE_CHANNEL_ID = 'medicine-reminder-alarm';

export interface NotifeeReminderPayload {
  reminderId?: string;
  reminderIds?: string[];
  medicineIds?: string[];
  medicineNames?: string[];
  foodInstruction?: string;
  count?: number;
  scheduledTime?: string;
  title: string;
  body: string;
}

class NotifeeNotificationService {
  private isInitialized = false;
  private notifeeModule: any = null;

  constructor() {
    this.init();
  }

  public isNotifeeSupported(): boolean {
    if (Platform.OS === 'web') return false;
    // In Expo Go, custom native modules like Notifee are not bundled into the binary.
    const isExpoGo =
      isRunningInExpoGo() ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo';
    if (isExpoGo) return false;

    try {
      if (!NativeModules || !NativeModules.NotifeeApiModule) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  }

  private async getNotifee() {
    if (!this.isNotifeeSupported()) return null;
    if (this.notifeeModule) return this.notifeeModule;

    try {
      const mod = await import('@notifee/react-native');
      this.notifeeModule = mod.default || mod;
      return this.notifeeModule;
    } catch (err) {
      return null;
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized || Platform.OS === 'web' || !this.isNotifeeSupported()) return;

    try {
      const notifee = await this.getNotifee();
      if (!notifee) return;

      // 1. Request notification permissions (Android 13+ & iOS)
      await notifee.requestPermission();

      // 2. Create high-priority alarm notification channel on Android
      const AndroidImportance = notifee.AndroidImportance || 4;
      await notifee.createChannel({
        id: NOTIFEE_CHANNEL_ID,
        name: 'Medicine Reminder Alarm',
        description: 'High-priority sound alarms and reminders for scheduled patient medications',
        importance: AndroidImportance.HIGH || 4,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        bypassDnd: true,
      });

      // 3. Register foreground event listener
      const { EventType } = await import('@notifee/react-native');
      notifee.onForegroundEvent(async ({ type, detail }: any) => {
        if (type === EventType.ACTION_PRESS) {
          const actionId = detail?.pressAction?.id;
          const data = detail?.notification?.data;
          console.log('[Notifee] Foreground action pressed:', actionId, data);
          if (actionId && actionId !== 'default') {
            await this.handleAction(actionId, data);
          }
          if (detail?.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }
        }
      });

      // 4. Register background event listener
      notifee.onBackgroundEvent(async ({ type, detail }: any) => {
        if (type === EventType.ACTION_PRESS) {
          const actionId = detail?.pressAction?.id;
          const data = detail?.notification?.data;
          console.log('[Notifee] Background action pressed:', actionId, data);
          if (actionId && actionId !== 'default') {
            await this.handleAction(actionId, data);
          }
          if (detail?.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }
        }
      });

      this.isInitialized = true;
      console.log('✅ [NotifeeNotificationService] Successfully initialized Notifee alarm channel');
    } catch (e) {
      console.warn('⚠️ [NotifeeNotificationService] Notice initializing Notifee:', e);
    }
  }

  /**
   * Displays high-priority reminder notification with interactive action buttons and audio alarm.
   * Runs on standalone/development builds where Notifee native module exists.
   */
  public async displayReminder(payload: NotifeeReminderPayload): Promise<string | null> {
    if (Platform.OS === 'web' || !this.isNotifeeSupported()) return null;

    const rIds = payload.reminderIds || (payload.reminderId ? [payload.reminderId] : []);
    const mIds = payload.medicineIds || [];
    const count = payload.count || mIds.length || 1;

    try {
      const notifee = await this.getNotifee();
      if (!notifee) return null;

      await this.init();

      const { AndroidImportance, AndroidCategory } = await import('@notifee/react-native');

      const notifId = await notifee.displayNotification({
        title: payload.title,
        body: payload.body,
        data: {
          reminderIds: rIds.join(','),
          reminderId: payload.reminderId || rIds[0] || '',
          medicineIds: mIds.join(','),
          medicineNames: (payload.medicineNames || []).join(', '),
          foodInstruction: payload.foodInstruction || '',
          scheduledTime: payload.scheduledTime || '',
        },
        android: {
          channelId: NOTIFEE_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.ALARM,
          sound: 'default',
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: count > 1 ? `✓ Taken (${count})` : '✓ Taken',
              pressAction: { id: 'taken' },
            },
            {
              title: '⏰ Snooze (5m)',
              pressAction: { id: 'snooze' },
            },
            {
              title: '⏳ Postpone',
              pressAction: { id: 'postpone' },
            },
            {
              title: '✕ Missed',
              pressAction: { id: 'dismiss' },
            },
          ],
        },
      });

      console.log('🚀 [NotifeeNotificationService] Displayed reminder notification ID:', notifId);
      return notifId;
    } catch (e) {
      console.warn('Error displaying reminder notification:', e);
      return null;
    }
  }

  /**
   * Handles 1-click status updates from Notifee action buttons directly to Spring Boot backend
   */
  public async handleAction(action: string, data?: any): Promise<void> {
    try {
      const rawReminderIds = data?.reminderIds;
      const rawMedicineIds = data?.medicineIds;

      const rIds = rawReminderIds
        ? (typeof rawReminderIds === 'string' ? rawReminderIds.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n)) : rawReminderIds)
        : [];
      const mIds = rawMedicineIds
        ? (typeof rawMedicineIds === 'string' ? rawMedicineIds.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n)) : rawMedicineIds)
        : [];

      const endpoint = action.toLowerCase();
      console.log(`[Notifee] Dispatching /reminders/batch/${endpoint} for ${rIds.length} reminders, ${mIds.length} medicines`);

      await apiClient.post(`/reminders/batch/${endpoint}`, {
        reminderIds: rIds,
        medicineIds: mIds,
        action: endpoint,
        notes: `Updated via Notifee notification (${action}) for ${mIds.length || rIds.length || 1} medicine(s)`,
      });

      console.log(`✅ [Notifee] Backend successfully updated status: ${action}`);
    } catch (err) {
      console.warn('Error handling Notifee notification action:', err);
    }
  }

  /**
   * Test reminder notification directly on the device
   */
  public async testReminderNotification(): Promise<string | null> {
    return this.displayReminder({
      title: '💊 Medicine Reminder (Test)',
      body: 'Instruction: After Food\n• Stamlo 5mg\n• Arvant 10mg',
      medicineNames: ['Stamlo 5mg', 'Arvant 10mg'],
      foodInstruction: 'AFTER_FOOD',
      count: 2,
      scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }
}

export const notifeeNotificationService = new NotifeeNotificationService();
