import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { BorderRadius, Spacing } from '@/constants/theme';
import { fcmService } from '@/services/fcmService';
import { alarmService } from '@/services/alarmService';
import { notifeeNotificationService } from '@/services/notifeeNotificationService';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import {
  ClockIcon,
  CheckIcon,
  ShieldCheckIcon,
  CopyIcon,
} from '@/components/common/Icons';

export const ReminderNotificationCard: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [copied, setCopied] = useState(false);

  // Sync token and permission state
  const checkStatus = useCallback(() => {
    const token = fcmService.getStoredToken() || (user as any)?.fcmToken || null;
    if (token) {
      setFcmToken(token);
    }
    const perm = fcmService.getPermissionStatus();
    setPermissionStatus(perm);
  }, [user]);

  useEffect(() => {
    checkStatus();

    // Re-check automatically when user switches back to this tab (e.g. after toggling browser address bar permissions)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('focus', checkStatus);
      return () => window.removeEventListener('focus', checkStatus);
    }
  }, [checkStatus]);

  const hasFcmToken = !!fcmToken;
  const isBlocked = permissionStatus === 'denied';

  const handleReminderAction = async () => {
    setLoading(true);
    setToast(null);

    // If browser permission is blocked, display explicit instructions
    if (fcmService.isPermissionDenied()) {
      setPermissionStatus('denied');
      setToast({
        id: 'fcm_blocked',
        type: 'error',
        message: 'Notification permission is blocked in your browser. Click the lock/site settings icon in your address bar to Allow notifications, then click "Check Again".',
      });
      setLoading(false);
      return;
    }

    try {
      const result = await fcmService.enableReminders(hasFcmToken);
      setFcmToken(result.token);
      setPermissionStatus('granted');
      setToast({
        id: 'fcm_ok',
        type: 'success',
        message: hasFcmToken
          ? 'Fresh reminder token generated and synchronized with backend!'
          : 'Push notifications & alarm reminders enabled and synchronized with backend!',
      });
    } catch (err: any) {
      setPermissionStatus(fcmService.getPermissionStatus());
      setToast({
        id: 'fcm_err',
        type: 'error',
        message: err.message || 'Failed to update reminder settings.',
      });
    } finally {
      setLoading(false);
    }
  };

  const [testPushLoading, setTestPushLoading] = useState(false);

  const handleSendTestPush = async () => {
    setTestPushLoading(true);
    setToast(null);
    try {
      const res = await fcmService.triggerTestNotification();
      const data = res?.data || res;
      if (!data?.dispatched) {
        setToast({
          id: 'test_err',
          type: 'error',
          message: data?.error || 'Backend could not dispatch push: No active FCM token or medicines found.',
        });
        return;
      }
      if (data?.firebaseResult && String(data.firebaseResult).includes('ERROR')) {
        setToast({
          id: 'test_err',
          type: 'error',
          message: `Firebase notice: ${JSON.stringify(data.firebaseResult)}. Refreshing reminder token...`,
        });
        await fcmService.enableReminders(true);
      } else {
        setToast({
          id: 'test_ok',
          type: 'success',
          message: '🚀 Push notification dispatched to device! Check your notification drawer and lock screen.',
        });
      }
    } catch (e: any) {
      setToast({
        id: 'test_err',
        type: 'error',
        message: e?.message || 'Failed to dispatch test notification.',
      });
    } finally {
      setTestPushLoading(false);
    }
  };

  const handleTestDeviceNotificationDirectly = async () => {
    if (Platform.OS !== 'web') {
      try {
        await notifeeNotificationService.testReminderNotification();
        await alarmService.startAlarm({
          title: '💊 Medicine Reminder (Device Test)',
          body: 'Instruction: After Food\n• Stamlo 5mg\n• Arvant 10mg',
          medicineNames: ['Stamlo 5mg', 'Arvant 10mg'],
          foodInstruction: 'After Food',
          count: 2,
          scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          receivedAt: Date.now(),
        });
        setToast({
          id: 'direct_ok',
          type: 'success',
          message: '🔔 Reminder notification triggered on your mobile device with action buttons!',
        });
      } catch (e: any) {
        setToast({ id: 'err', type: 'error', message: e.message || 'Failed to trigger notification.' });
      }
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setToast({ id: 'err', type: 'error', message: 'Notifications are not supported in this browser.' });
      return;
    }
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      setPermissionStatus(p);
      if (p !== 'granted') {
        setToast({
          id: 'err',
          type: 'error',
          message: 'Please click the lock/tune icon in the browser address bar and choose "Allow" for Notifications.',
        });
        return;
      }
    }
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        // 1. Details Notification (Houses ⏳ Postpone & ✕ Missed)
        reg.showNotification('💊 Medicine Reminder (Device Test)', {
          body: 'Instruction: After Food\n• Stamlo 5mg\n• Arvant 10mg',
          icon: '/firebase-logo.png',
          tag: 'medi-pcr-details-' + Date.now(),
          renotify: true,
          vibrate: [300, 100, 300],
          actions: [
            { action: 'postpone', title: '⏳ Postpone' },
            { action: 'dismiss', title: '✕ Missed' },
          ],
        } as any);

        // 2. MediStatus Actions Notification (Houses ✓ Taken & ⏰ Snooze)
        reg.showNotification('📋 Update MediStatus: Did you take your medicine?', {
          body: 'Tap a button below to update status directly:',
          icon: '/firebase-logo.png',
          tag: 'medi-pcr-actions-' + Date.now(),
          renotify: true,
          requireInteraction: true,
          vibrate: [500, 250, 500],
          actions: [
            { action: 'taken', title: '✓ Taken' },
            { action: 'snooze', title: '⏰ Snooze (5m)' },
          ],
        } as any);

        // 3. Play alarm audio ringtone and trigger active ringing overlay
        alarmService.startAlarm({
          title: '💊 Medicine Reminder (Device Test)',
          body: 'Instruction: After Food\n• Stamlo 5mg\n• Arvant 10mg',
          medicineNames: ['Stamlo 5mg', 'Arvant 10mg'],
          foodInstruction: 'After Food',
          count: 2,
          scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          receivedAt: Date.now(),
        });

        setToast({
          id: 'direct_ok',
          type: 'success',
          message: '🔔 2 notifications sent with audio alarm! All 4 action buttons (Taken, Snooze, Postpone, Missed) are visible in your Windows Notification Center.',
        });
      }
    } catch (e: any) {
      setToast({ id: 'err', type: 'error', message: e.message || 'Failed to trigger notification.' });
    }
  };

  const handleTestNotifee = async () => {
    try {
      const id = await notifeeNotificationService.testReminderNotification();
      if (id) {
        setToast({
          id: 'notifee_ok',
          type: 'success',
          message: '📱 Notifee alarm notification displayed with audio and 4 action buttons (Taken, Snooze, Postpone, Missed)!',
        });
      } else {
        setToast({
          id: 'notifee_info',
          type: 'info',
          message: 'Notifee native alarms run on Android/iOS devices. For web preview, use "Direct Test" or "Test FCM Push".',
        });
      }
    } catch (e: any) {
      setToast({
        id: 'notifee_err',
        type: 'error',
        message: e?.message || 'Failed to trigger Notifee notification.',
      });
    }
  };

  const handleCopyToken = () => {
    if (fcmToken && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fcmToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Button title based on whether FCM token exists
  const buttonTitle = loading
    ? (hasFcmToken ? 'Refreshing reminder...' : 'Enabling reminders...')
    : (hasFcmToken ? 'Refresh reminder' : 'Enable Reminders');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
          borderColor: hasFcmToken ? colors.primary : colors.border,
        },
      ]}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: hasFcmToken ? colors.primaryLight : isDark ? colors.surfaceHighlight : '#F1F5F9' },
            ]}>
            <ClockIcon size={20} color={hasFcmToken ? colors.primary : colors.textSecondary} />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Device Push Reminders & MediStatus
            </Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              Receive 2 notifications on your device: Medicine details & 1-click MediStatus buttons
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: hasFcmToken ? colors.successBg : isDark ? colors.surfaceHighlight : '#F3F4F6',
              borderColor: hasFcmToken ? colors.success : colors.border,
            },
          ]}>
          {hasFcmToken ? (
            <CheckIcon size={12} color={colors.success} />
          ) : (
            <ClockIcon size={12} color={colors.textMuted} />
          )}
          <Text
            style={[
              styles.badgeText,
              { color: hasFcmToken ? colors.success : colors.textMuted },
            ]}>
            {hasFcmToken ? 'Reminders Active' : 'Setup Required'}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Your device will receive 2 push notifications in its notification drawer: (1) Medicine details message with food instructions, and (2) Update MediStatus notification with 1-tap Taken, Snooze, Postpone, and Missed buttons.
      </Text>

      {/* Permission Blocked Helper Banner */}
      {isBlocked && (
        <View
          style={[
            styles.blockedBox,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              borderColor: '#EF4444',
            },
          ]}>
          <View style={styles.blockedHeader}>
            <Text style={styles.blockedTitle}>
              ⚠️ Notification Permission Blocked in Browser
            </Text>
            <Pressable
              onPress={checkStatus}
              style={styles.checkPermBtn}>
              <Text style={styles.checkPermBtnText}>🔄 Check Again</Text>
            </Pressable>
          </View>
          <Text style={[styles.blockedDesc, { color: colors.textSecondary }]}>
            Your browser currently blocks notifications for this site. To allow reminders on your device:
          </Text>
          <View style={styles.blockedSteps}>
            <Text style={[styles.stepItem, { color: colors.text }]}>
              1. Look at the top browser address bar (where the URL is located).
            </Text>
            <Text style={[styles.stepItem, { color: colors.text }]}>
              2. Click the 🔒 (Lock) or 🎛️ (Tune / Site settings) icon to the left of the URL.
            </Text>
            <Text style={[styles.stepItem, { color: colors.text }]}>
              3. Change <Text style={{ fontWeight: '700' }}>Notifications</Text> to <Text style={{ fontWeight: '700', color: '#10B981' }}>Allow</Text>.
            </Text>
            <Text style={[styles.stepItem, { color: colors.text }]}>
              4. Tap <Text style={{ fontWeight: '700' }}>"Check Again"</Text> or refresh this tab.
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Button
          title={buttonTitle}
          variant={hasFcmToken ? 'outline' : 'primary'}
          size="md"
          loading={loading}
          onPress={handleReminderAction}
          style={{ flex: 1.2 }}
        />

        <Button
          title={testPushLoading ? 'Dispatching...' : '🚀 Test FCM Push'}
          variant="secondary"
          size="md"
          loading={testPushLoading}
          onPress={handleSendTestPush}
          style={{ flex: 1.2 }}
        />

        <Button
          title="⚡ Direct Test (2 Notifs)"
          variant="outline"
          size="md"
          onPress={handleTestDeviceNotificationDirectly}
          style={{ flex: 1.2 }}
        />

        <Button
          title="🔊 Test Alarm Audio"
          variant="outline"
          size="md"
          onPress={() => alarmService.testGroupedAlarmSound()}
          style={{ flex: 1.2 }}
        />

        <Button
          title="📱 Test Notifee (Android)"
          variant="outline"
          size="md"
          onPress={handleTestNotifee}
          style={{ flex: 1.2 }}
        />
      </View>

      {/* FCM Token Display (Collapsible / Copyable) */}
      {fcmToken && (
        <View
          style={[
            styles.tokenBox,
            {
              backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.tokenHeader}>
            <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>
              Device FCM Token Registered:
            </Text>
            <Pressable onPress={handleCopyToken} style={styles.copyBtn}>
              <CopyIcon size={14} color={colors.primary} />
              <Text style={[styles.copyBtnText, { color: colors.primary }]}>
                {copied ? 'Copied!' : 'Copy Token'}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.tokenText, { color: colors.textMuted }]} numberOfLines={1}>
            {fcmToken}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    minWidth: 260,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.four,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.two,
    flexWrap: 'wrap',
  },
  tokenBox: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tokenLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  tokenText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  blockedBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  blockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  blockedTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  checkPermBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
  },
  checkPermBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  blockedDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  blockedSteps: {
    gap: 4,
    paddingLeft: Spacing.one,
  },
  stepItem: {
    fontSize: 12,
    lineHeight: 18,
  },
});
