import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { alarmService, ActiveAlarmInfo } from '@/services/alarmService';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius } from '@/constants/theme';
import { ClockIcon, CloseIcon, CheckIcon } from '@/components/common/Icons';

export const ActiveRingingBar: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const [alarm, setAlarm] = useState<ActiveAlarmInfo | null>(null);

  useEffect(() => {
    const unsubscribe = alarmService.subscribe((active) => {
      setAlarm(active);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!alarm) return null;

  const medNames =
    alarm.medicineNames && alarm.medicineNames.length > 0
      ? alarm.medicineNames.join(', ')
      : 'Medication';

  const count = alarm.count || (alarm.medicineNames ? alarm.medicineNames.length : 1);

  return (
    <View style={styles.floatingContainer}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: colors.primary,
          },
        ]}>
        <View style={styles.leftInfo}>
          <ClockIcon size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              🔔 Reminder Ringing: {medNames}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {alarm.foodInstruction ? `${alarm.foodInstruction} • ` : ''}
              {count > 1 ? `${count} medicines due` : '1 medicine due'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {/* 1. Taken */}
          <Pressable
            onPress={() => alarmService.handleAction('taken')}
            style={[styles.actionBtn, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <CheckIcon size={13} color={colors.success} />
            <Text style={[styles.actionBtnText, { color: colors.success }]}>Taken</Text>
          </Pressable>

          {/* 2. Snooze (5m) */}
          <Pressable
            onPress={() => alarmService.handleAction('snooze')}
            style={[styles.actionBtn, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Text style={{ fontSize: 12 }}>⏰</Text>
            <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Snooze (5m)</Text>
          </Pressable>

          {/* 3. Postpone */}
          <Pressable
            onPress={() => alarmService.handleAction('postpone')}
            style={[styles.actionBtn, { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' }]}>
            <Text style={{ fontSize: 12 }}>⏳</Text>
            <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Postpone</Text>
          </Pressable>

          {/* 4. Dismiss */}
          <Pressable
            onPress={() => alarmService.handleAction('dismiss')}
            style={[styles.actionBtn, { backgroundColor: '#FEE2E2', borderColor: colors.danger }]}>
            <CloseIcon size={13} color={colors.danger} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    maxWidth: 780,
    width: '100%',
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 6px 20px -2px rgba(0, 0, 0, 0.25)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  leftInfo: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
