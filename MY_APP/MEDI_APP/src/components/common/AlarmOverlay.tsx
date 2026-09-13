import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { alarmService, ActiveAlarmInfo } from '@/services/alarmService';
import { ClockIcon, CheckIcon, CloseIcon } from '@/components/common/Icons';

export const AlarmOverlay: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmInfo | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const unsubscribe = alarmService.subscribe((alarm) => {
      setActiveAlarm(alarm);
    });

    // Ringing pulse interval
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, 600);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!activeAlarm) {
    return null;
  }

  const medCount =
    activeAlarm.count ||
    activeAlarm.medicineNames?.length ||
    activeAlarm.medicineIds?.length ||
    1;
  const isMultiMed = medCount > 1;

  const handleAction = async (action: 'taken' | 'snooze' | 'dismiss' | 'postpone') => {
    await alarmService.handleAction(action);
  };

  return (
    <Modal
      visible={!!activeAlarm}
      transparent
      animationType="fade"
      onRequestClose={() => handleAction('dismiss')}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.alarmCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
              borderColor: pulse ? colors.primary : colors.border,
            },
          ]}>
          {/* Pulsing Alarm Icon Badge */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: pulse ? colors.primary : colors.primaryLight,
                transform: [{ scale: pulse ? 1.08 : 1.0 }],
              },
            ]}>
            <ClockIcon size={34} color={pulse ? '#FFFFFF' : colors.primary} />
          </View>

          {/* Alarm Status & Title */}
          <Text style={[styles.ringingTag, { color: colors.primary }]}>
            🔊 MEDICATION ALARM RINGING
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {activeAlarm.title || (isMultiMed ? `💊 Reminder (${medCount} Medicines)` : '💊 Medicine Reminder')}
          </Text>

          {/* Audio Blocked Unmute Banner */}
          {activeAlarm.audioBlocked ? (
            <Pressable
              onPress={() => alarmService.unmuteAndPlay()}
              style={[styles.unmuteBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={styles.unmuteText}>
                🔔 Sound is muted by browser. Tap here to turn sound ON!
              </Text>
            </Pressable>
          ) : null}

          {/* Food Instruction Tag if available */}
          {activeAlarm.foodInstruction && activeAlarm.foodInstruction.trim() ? (
            <View style={[styles.instructionBadge, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
              <Text style={[styles.instructionText, { color: colors.primary }]}>
                🍽️ {activeAlarm.foodInstruction.replace('_', ' ')}
              </Text>
            </View>
          ) : null}

          {/* Medicines Grouped List if present */}
          {Boolean(activeAlarm.medicineNames && activeAlarm.medicineNames.length > 0) ? (
            <View style={styles.medsContainer}>
              <Text style={[styles.medsHeader, { color: colors.textSecondary }]}>
                {medCount} scheduled medicines at {activeAlarm.scheduledTime || 'this time'}:
              </Text>
              <View style={styles.medsList}>
                {activeAlarm.medicineNames!.map((name, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.medChip,
                      {
                        backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                        borderColor: colors.border,
                      },
                    ]}>
                    <Text style={styles.medBullet}>💊</Text>
                    <Text style={[styles.medChipText, { color: colors.text }]}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {activeAlarm.body || 'Time to take your scheduled medication. Tap any action to stop the ringing.'}
            </Text>
          )}

          <Text style={[styles.oneClickNote, { color: colors.textMuted }]}>
            {`⚡ 1-click will update the MediStatus for all ${medCount} medicine${medCount > 1 ? 's' : ''} simultaneously`}
          </Text>

          {/* Interactive 1-Click Action Buttons */}
          <View style={styles.actionGrid}>
            {/* 1. Taken Button (Primary 1-Click Batch Update) */}
            <Pressable
              onPress={() => handleAction('taken')}
              style={[styles.actionBtn, { backgroundColor: colors.success }]}>
              <CheckIcon size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnTextWhite}>
                {isMultiMed ? `✓ Mark All (${medCount}) as Taken` : '✓ Taken'}
              </Text>
            </Pressable>

            {/* 2. Snooze Button */}
            <Pressable
              onPress={() => handleAction('snooze')}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? '#3D2F14' : '#FEF3C7',
                  borderColor: isDark ? '#D97706' : '#F59E0B',
                  borderWidth: 1.5,
                },
              ]}>
              <ClockIcon size={18} color={isDark ? '#FBBF24' : '#D97706'} />
              <Text style={[styles.actionBtnTextDark, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                {isMultiMed ? `⏰ Snooze All (${medCount}) 10m` : '⏰ Snooze (10m)'}
              </Text>
            </Pressable>

            {/* 3. Postpone Button */}
            <Pressable
              onPress={() => handleAction('postpone')}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9',
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}>
              <Text style={[styles.actionBtnTextDark, { color: colors.text }]}>
                {isMultiMed ? `⏳ Postpone All (${medCount})` : '⏳ Postpone'}
              </Text>
            </Pressable>

            {/* 4. Dismiss Button */}
            <Pressable
              onPress={() => handleAction('dismiss')}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? '#3B1A1A' : '#FEE2E2',
                  borderColor: colors.danger,
                  borderWidth: 1,
                },
              ]}>
              <CloseIcon size={18} color={colors.danger} />
              <Text style={[styles.actionBtnTextDark, { color: colors.danger }]}>
                {isMultiMed ? `✕ Dismiss All (${medCount})` : '✕ Dismiss'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  alarmCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    padding: Spacing.five,
    alignItems: 'center',
    ...Shadows.xl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  ringingTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.four,
    lineHeight: 20,
  },
  actionGrid: {
    width: '100%',
    gap: Spacing.two,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: BorderRadius.lg,
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnTextDark: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  instructionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: Spacing.two,
  },
  instructionText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  medsContainer: {
    width: '100%',
    marginBottom: Spacing.three,
  },
  medsHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  medsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  medChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  medBullet: {
    fontSize: 13,
  },
  medChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  oneClickNote: {
    fontSize: 11.5,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  unmuteBanner: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: Spacing.two,
    alignItems: 'center',
  },
  unmuteText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
  },
});
