import { Platform } from 'react-native';
import { apiClient } from './api';
import { notifeeNotificationService } from './notifeeNotificationService';

export interface ActiveAlarmInfo {
  reminderId?: string;
  reminderIds?: string[];
  medicineIds?: string[];
  medicineNames?: string[];
  foodInstruction?: string;
  count?: number;
  scheduledTime?: string;
  title: string;
  body: string;
  receivedAt: number;
  audioBlocked?: boolean;
}

type AlarmListener = (activeAlarm: ActiveAlarmInfo | null) => void;

class AlarmService {
  private audioElement: HTMLAudioElement | null = null;
  private isRinging: boolean = false;
  private currentAlarm: ActiveAlarmInfo | null = null;
  private listeners: Set<AlarmListener> = new Set();
  private isServiceWorkerListening: boolean = false;
  private isAudioUnlocked: boolean = false;
  private audioCtx: any = null;
  private synthInterval: any = null;
  private localSchedulerInterval: any = null;
  private autoStopTimer: any = null;
  private triggeredSlots: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
      this.listenToServiceWorker();
      this.setupAutoplayUnlock();
      this.startLocalScheduler();
      this.checkUrlAlarmTrigger();
    }
  }

  private initAudio(): void {
    try {
      // Primary ringtone in music folder
      const audioUrl = '/music/Born_To_Shine_-_Ringtone____Diljit_dosanjh_Song_Ringtones_@diljitdosanjh(256k).mp3';
      this.audioElement = new Audio(audioUrl);
      this.audioElement.loop = true; // Ring continuously like an alarm until user clicks Taken or Snooze
      this.audioElement.preload = 'auto';

      // Fallback if primary fails
      this.audioElement.onerror = () => {
        console.warn('Primary alarm audio failed, falling back to /alarm.mp3');
        if (this.audioElement) {
          this.audioElement.src = '/alarm.mp3';
          this.audioElement.loop = true;
        }
      };
    } catch (e) {
      console.warn('Audio element initialization error:', e);
    }
  }

  /**
   * Pre-unlocks audio context and element on first user gesture
   * to comply with browser Autoplay Policy
   */
  public setupAutoplayUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass && !this.audioCtx) {
          this.audioCtx = new AudioCtxClass();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        if (this.audioElement && !this.isAudioUnlocked) {
          const p = this.audioElement.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              if (!this.isRinging) {
                this.audioElement?.pause();
                this.audioElement!.currentTime = 0;
              }
              this.isAudioUnlocked = true;
              console.log('🔊 Audio successfully unlocked by user interaction');
            }).catch(() => {});
          }
        }
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              window.dispatchEvent(new CustomEvent('SYNC_FCM_TOKEN'));
            }
          }).catch(() => {});
        }
      } catch (e) {
        // ignore unlock error
      }
    };

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  /**
   * Checks if app was launched/opened from a Windows notification click with active alarm params.
   * Rings the alarm audio and shows the overlay immediately.
   */
  public checkUrlAlarmTrigger(): void {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('alarm') === '1' || urlParams.get('alarm') === 'true') {
        const reminderId = urlParams.get('reminderId') || undefined;
        const reminderIds = (urlParams.get('reminderIds') || '').split(',').filter(Boolean);
        const medicineIds = (urlParams.get('medicineIds') || '').split(',').filter(Boolean);
        const medicineNames = (urlParams.get('medicineNames') || '').split(', ').filter(Boolean);
        const foodInstruction = urlParams.get('foodInstruction') || undefined;
        const scheduledTime = urlParams.get('scheduledTime') || undefined;
        const title = urlParams.get('title') || '💊 Medicine Reminder';
        const body = urlParams.get('body') || 'Time to take your scheduled medication.';

        console.log('🚀 [alarmService] App opened via notification click with active alarm! Starting alarm audio immediately...');
        
        // Clean URL query params without page refresh
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        setTimeout(() => {
          this.startAlarm({
            reminderId,
            reminderIds,
            medicineIds,
            medicineNames,
            foodInstruction,
            count: medicineNames.length || 1,
            scheduledTime,
            title,
            body,
            receivedAt: Date.now(),
          });
        }, 150);
      }
    } catch (e) {
      console.warn('Error checking URL alarm params:', e);
    }
  }

  /**
   * Web Audio API synthesized alarm chime fallback
   * Disabled to prevent unwanted secondary ringing sound over the ringtone
   */
  private startSynthAlarm(): void {
    this.stopSynthAlarm();
  }

  private stopSynthAlarm(): void {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try {
        this.audioCtx.suspend();
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Allows user to manually unmute/resume the alarm if browser blocked autoplay
   */
  public async unmuteAndPlay(): Promise<void> {
    if (this.audioElement) {
      try {
        await this.audioElement.play();
        this.isAudioUnlocked = true;
        if (this.currentAlarm) {
          this.currentAlarm.audioBlocked = false;
          this.notify();
        }
        console.log('🔊 Alarm unmuted and playing successfully');
      } catch (e) {
        console.warn('Manual unmute play failed:', e);
        this.startSynthAlarm();
      }
    }
  }

  private listenToServiceWorker(): void {
    if (this.isServiceWorkerListening || typeof window === 'undefined') {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      console.log('[alarmService] Received message:', event.data);
      const data = event.data;
      if (!data) return;

      if (data.type === 'START_ALARM') {
        const rIds = data.reminderIds || (data.reminderId ? [data.reminderId] : []);
        const mIds = data.medicineIds || [];
        const mNames = data.medicineNames || [];
        this.startAlarm({
          reminderId: data.reminderId,
          reminderIds: rIds,
          medicineIds: mIds,
          medicineNames: mNames,
          foodInstruction: data.foodInstruction,
          count: data.count || (mNames.length > 0 ? mNames.length : 1),
          scheduledTime: data.scheduledTime,
          title: data.title || '💊 Medicine Reminder',
          body: data.body || 'Time to take your scheduled medication.',
          receivedAt: Date.now(),
        });
      } else if (data.type === 'STOP_ALARM' || data.type === 'MEDISTATUS_UPDATED') {
        console.log('[alarmService] Received STOP_ALARM / MEDISTATUS_UPDATED -> stopping audio immediately');
        this.stopAlarm();
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('medi_pcr_alarm_channel');
        bc.onmessage = (event) => {
          console.log('[alarmService] Received from BroadcastChannel:', event.data);
          handleMessage(event);
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }
    window.addEventListener('message', handleMessage);
    window.addEventListener('MEDISTATUS_UPDATED', () => {
      console.log('[alarmService] CustomEvent MEDISTATUS_UPDATED -> stopping alarm');
      this.stopAlarm();
    });

    this.isServiceWorkerListening = true;
  }

  public subscribe(listener: AlarmListener): () => void {
    this.listeners.add(listener);
    listener(this.currentAlarm);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentAlarm);
      } catch (e) {
        console.error('Error in alarm listener:', e);
      }
    }
  }

  /**
   * Starts ringing the alarm audio continuously when reminder message arrives
   */
  public async startAlarm(info: ActiveAlarmInfo): Promise<void> {
    if (this.isRinging) {
      console.log('🔔 Alarm is already ringing, updating active info.');
      this.currentAlarm = { ...info, audioBlocked: false };
      this.notify();
      return;
    }

    this.currentAlarm = { ...info, audioBlocked: false };
    this.isRinging = true;
    this.notify();

    // Clear any existing auto-stop timer
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    // Unattended safety limit: 60 seconds
    this.autoStopTimer = setTimeout(() => {
      console.log('⏹ Auto-stopping alarm after 60s unattended timeout.');
      this.stopAlarm();
    }, 60000);

    // On native mobile (Android/iOS), trigger Notifee high-priority heads-up notification with sound & action buttons
    if (Platform.OS !== 'web') {
      try {
        notifeeNotificationService.displayReminder({
          reminderId: info.reminderId,
          reminderIds: info.reminderIds,
          medicineIds: info.medicineIds,
          medicineNames: info.medicineNames,
          foodInstruction: info.foodInstruction,
          count: info.count,
          scheduledTime: info.scheduledTime,
          title: info.title || '💊 Medicine Reminder',
          body: info.body || 'Time to take your scheduled medication.',
        });
      } catch (notifErr) {
        console.warn('Notice triggering Notifee reminder:', notifErr);
      }
    }

    if (typeof window !== 'undefined') {
      // 1. Show interactive notification on the device (lock screen, action center, notification shade)
      this.showDeviceNotification(info);

      try {
        if (!this.audioElement) {
          this.initAudio();
        }
        if (this.audioElement) {
          this.audioElement.loop = true; // Ring continuously like an alarm until user takes action
          this.audioElement.currentTime = 0;
          this.stopSynthAlarm();
          await this.audioElement.play();
          console.log('🔊 Alarm sound ringing continuously.');
        }

        // Vibrate if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([600, 300, 600]);
        }
      } catch (err) {
        console.warn('Audio autoplay prevented by browser. Requiring user gesture:', err);
        if (this.currentAlarm) {
          this.currentAlarm.audioBlocked = true;
          this.notify();
        }

        // Attach one-time gesture listener to unmute cleanly on first click
        const onGesture = () => {
          if (this.isRinging && this.audioElement) {
            this.stopSynthAlarm();
            this.audioElement.loop = true;
            this.audioElement.play().then(() => {
              this.stopSynthAlarm();
              if (this.currentAlarm) {
                this.currentAlarm.audioBlocked = false;
                this.notify();
              }
            }).catch(() => {});
          }
          window.removeEventListener('click', onGesture);
          window.removeEventListener('touchstart', onGesture);
        };
        window.addEventListener('click', onGesture);
        window.addEventListener('touchstart', onGesture);
      }
    }
  }

  /**
   * Displays native system/device notification with interactive action buttons
   * so the reminder pops up directly on the device (outside the app window / lock screen)
   */
  public async showDeviceNotification(info: ActiveAlarmInfo): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    try {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      } else if (Notification.permission !== 'granted') {
        return;
      }

      const count = info.count || info.medicineNames?.length || 1;
      const title = info.title || (count > 1 ? `💊 Medicine Reminder (${count} medicines)` : '💊 Medicine Reminder');
      const body = info.body || 'Time to take your scheduled medication.';
      const origin = window.location?.origin || '';
      const iconUrl = origin ? `${origin}/firebase-logo.png` : '/firebase-logo.png';

      const rIds = info.reminderIds || (info.reminderId ? [info.reminderId] : []);
      const mIds = info.medicineIds || [];
      const mNames = info.medicineNames || [];

      const notifData = {
        reminderId: info.reminderId,
        reminderIds: rIds.join(','),
        medicineIds: mIds.join(','),
        medicineNames: mNames.join(', '),
        foodInstruction: info.foodInstruction || '',
        count: count,
        scheduledTime: info.scheduledTime || '',
      };

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        // Notification 1: Medicine Details & Instructions (Postpone & Missed)
        await reg.showNotification(title, {
          body: body,
          icon: iconUrl,
          badge: iconUrl,
          tag: 'medi-pcr-details-' + Date.now(),
          renotify: true,
          requireInteraction: false,
          vibrate: [300, 100, 300],
          data: notifData,
          actions: [
            { action: 'postpone', title: '⏳ Postpone' },
            { action: 'dismiss', title: '✕ Missed' },
          ],
        } as any);

        // Notification 2: MediStatus 1-Click Action Buttons (Taken & Snooze)
        await reg.showNotification('📋 Update MediStatus: Did you take your medicine?', {
          body: 'Tap a button below to update status directly:',
          icon: iconUrl,
          badge: iconUrl,
          tag: 'medi-pcr-actions-' + Date.now(),
          renotify: true,
          requireInteraction: true,
          vibrate: [500, 250, 500],
          data: notifData,
          actions: [
            { action: 'taken', title: count > 1 ? `✓ Taken (${count})` : '✓ Taken' },
            { action: 'snooze', title: '⏰ Snooze (5m)' },
          ],
        } as any);
      } else {
        new Notification(title, {
          body: body,
          icon: iconUrl,
          requireInteraction: true,
        });
      }
      console.log('📱 [alarmService] Device notification displayed successfully on device.');
    } catch (e) {
      console.warn('Could not display device notification:', e);
    }
  }

  /**
   * Stops the ringing alarm audio and clears the active alarm state immediately
   */
  public stopAlarm(): void {
    console.log('⏹ Stopping alarm ringtone immediately.');
    this.isRinging = false;
    this.currentAlarm = null;

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    this.stopSynthAlarm();
    this.notify();

    if (typeof window !== 'undefined') {
      try {
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement.currentTime = 0;
          this.audioElement.loop = false;
        }
        if ('vibrate' in navigator) {
          navigator.vibrate(0);
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.getNotifications({ tag: 'medi-pcr-device-alarm' }).then((notifs) => {
              notifs.forEach((n) => n.close());
            }).catch(() => {});
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Error pausing audio:', err);
      }
    }
  }
  /**
   * Client-side local scheduler:
   * Polls every 15 seconds to ensure reminders trigger on the exact minute
   * even if FCM push notification was delayed or blocked by browser/network.
   */
  private startLocalScheduler(): void {
    if (typeof window === 'undefined') return;

    const checkReminders = async () => {
      // If already ringing, don't trigger new check
      if (this.isRinging) return;

      const token = apiClient.getToken();
      if (!token) return;

      try {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMin = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHour}:${currentMin}`;
        const currentDateStr = now.toISOString().split('T')[0];

        // Fetch user's active medicines
        const res = await apiClient.get<any>('/medicines');
        const medList: any[] = Array.isArray(res) ? res : res?.data || [];

        const dueMeds: any[] = [];
        for (const med of medList) {
          if (med.status !== 'ACTIVE') continue;
          if (med.startDate && currentDateStr < med.startDate) continue;
          if (med.endDate && currentDateStr > med.endDate) continue;

          // Check timings and verify slot has not already been taken, postponed, or missed/dismissed
          const checkSlot = (slotActive: boolean, slotStatus: string | null, slotTime: string | null) => {
            if (!slotActive || !slotTime) return false;
            if (slotStatus) {
              const s = slotStatus.toUpperCase();
              if (s.includes('TAKE') || s.includes('DISMISS') || s.includes('MISS') || s.includes('POSTPONE')) {
                return false;
              }
            }
            const cleanTime = slotTime.substring(0, 5); // "HH:mm"
            return cleanTime === currentTimeStr;
          };

          const isDue =
            checkSlot(med.morning, med.morningStatus, med.morningTime) ||
            checkSlot(med.afternoon, med.afternoonStatus, med.afternoonTime) ||
            checkSlot(med.evening, med.eveningStatus, med.eveningTime) ||
            checkSlot(med.night, med.nightStatus, med.nightTime);

          if (isDue) {
            const slotKey = `${med.id}_${currentTimeStr}_${currentDateStr}`;
            if (!this.triggeredSlots.has(slotKey)) {
              this.triggeredSlots.add(slotKey);
              dueMeds.push(med);
            }
          }
        }

        if (dueMeds.length > 0) {
          console.log(`⏰ [localScheduler] Found ${dueMeds.length} medicine(s) due at ${currentTimeStr}:`, dueMeds);
          const medicineIds = dueMeds.map((m) => String(m.id));
          const medicineNames = dueMeds.map((m) => m.medicineName);
          const foodInstruction = dueMeds[0]?.foodInstruction || '';
          const reminderIds = dueMeds.flatMap((m) => {
            const allRem = m.reminders || [];
            const matched = allRem.filter((r: any) => {
              const rTime = (r.reminderTime || '').substring(0, 5);
              return rTime === currentTimeStr;
            });
            return (matched.length > 0 ? matched : allRem).map((r: any) => String(r.id));
          });

          const bulletedMeds = dueMeds.map((m) => `• ${m.medicineName}`).join('\n');
          const cleanInstruction = foodInstruction ? foodInstruction.replace(/_/g, ' ') : 'General';
          const listwiseBody = `Instruction: ${cleanInstruction}\n${bulletedMeds}`;
          const title = dueMeds.length > 1 ? `💊 Medicine Reminder (${dueMeds.length} medicines)` : `💊 Medicine Reminder: ${medicineNames[0]}`;

          console.log(`⏰ [localScheduler] Triggering alarm & device notification for ${dueMeds.length} medicine(s) at ${currentTimeStr}`);
          await this.startAlarm({
            reminderIds,
            medicineIds,
            medicineNames,
            foodInstruction,
            count: dueMeds.length,
            scheduledTime: currentTimeStr,
            title,
            body: listwiseBody,
            receivedAt: Date.now(),
          });
        }
      } catch (e) {
        // Silently ignore background polling errors
      }
    };

    // Check every 15 seconds
    this.localSchedulerInterval = setInterval(checkReminders, 15000);
    // Also run immediately after delay
    setTimeout(checkReminders, 2500);
  }


  /**
   * Handles user action (Taken, Snooze, Dismiss, Postpone)
   * Stops the ringing immediately and sends 1-click status update to backend for ALL medicines
   */
  public async handleAction(
    action: 'taken' | 'snooze' | 'dismiss' | 'postpone',
    customReminderId?: string
  ): Promise<void> {
    const alarm = this.currentAlarm;

    // 1. Immediately stop the ringing!
    this.stopAlarm();

    // 2. Determine target endpoint
    let endpoint = action as string;
    if (action === 'taken') endpoint = 'complete';

    // 3. Collect reminderIds and medicineIds
    const rIds: number[] = [];
    if (alarm?.reminderIds && alarm.reminderIds.length > 0) {
      alarm.reminderIds.forEach((id) => {
        const n = Number(id);
        if (!isNaN(n)) rIds.push(n);
      });
    } else if (customReminderId || alarm?.reminderId) {
      const single = customReminderId || alarm?.reminderId;
      if (single) {
        single.split(/[,&]/).forEach((part) => {
          const n = Number(part.trim());
          if (!isNaN(n)) rIds.push(n);
        });
      }
    }

    const mIds: number[] = [];
    if (alarm?.medicineIds && alarm.medicineIds.length > 0) {
      alarm.medicineIds.forEach((id) => {
        const n = Number(id);
        if (!isNaN(n)) mIds.push(n);
      });
    }

    const medCount = mIds.length || rIds.length || alarm?.count || 1;

    try {
      if (rIds.length > 0 || mIds.length > 0) {
        await apiClient.post(`/reminders/batch/${endpoint}`, {
          reminderIds: rIds,
          medicineIds: mIds,
          status: action.toUpperCase(),
          notes: `Marked as ${action} for ${medCount} medicine(s) in 1 click`,
        });
        console.log(`Backend batch updated ${medCount} medicines: ${endpoint}`);
      } else if (alarm?.reminderId || customReminderId) {
        const single = customReminderId || alarm?.reminderId;
        await apiClient.post(`/reminders/${single}/${endpoint}`, {});
        console.log(`Backend single updated reminder ${single} -> ${endpoint}`);
      }
    } catch (err) {
      console.warn(`Failed to batch notify backend of action ${action}:`, err);
      // Fallback: try single reminder if present
      const fallbackId = customReminderId || alarm?.reminderId;
      if (fallbackId) {
        try {
          await apiClient.post(`/reminders/${fallbackId}/${endpoint}`, {});
        } catch (subErr) {
          console.error('Fallback endpoint also failed:', subErr);
        }
      }
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('MEDISTATUS_UPDATED', { detail: { action } }));
      }
    }
  }

  /**
   * Quick test function so user can verify audio playback
   */
  public async testAlarmSound(): Promise<void> {
    await this.startAlarm({
      reminderId: 'test_demo',
      title: '🔊 Alarm Audio Test',
      body: 'Testing the medicine reminder ringtone from the music folder.',
      receivedAt: Date.now(),
    });
  }

  /**
   * Test function to simulate a grouped multi-medicine reminder notification
   */
  public async testGroupedAlarmSound(): Promise<void> {
    await this.startAlarm({
      reminderId: '1',
      reminderIds: ['1', '2', '3'],
      medicineIds: ['101', '102', '103'],
      medicineNames: ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Vitamin D3'],
      foodInstruction: 'AFTER_FOOD',
      count: 3,
      title: '💊 Medicine Reminder (3 medicines)',
      body: 'Instruction: AFTER_FOOD\n• Paracetamol 500mg\n• Amoxicillin 250mg\n• Vitamin D3',
      receivedAt: Date.now(),
    });
  }

  public getIsRinging(): boolean {
    return this.isRinging;
  }

  public getCurrentAlarm(): ActiveAlarmInfo | null {
    return this.currentAlarm;
  }
}

export const alarmService = new AlarmService();
