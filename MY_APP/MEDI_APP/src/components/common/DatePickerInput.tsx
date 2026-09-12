import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/common/Icons';
import { Button } from '@/components/common/Button';

interface DatePickerInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string; // YYYY-MM-DD
  presetsType?: 'start' | 'end' | 'general';
  startDateRef?: string; // For relative calculations like +7 days from start
  containerStyle?: ViewStyle;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Format a Date object to YYYY-MM-DD string
export const formatDateToISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Human-friendly display: e.g. "Sep 5, 2026"
export const formatDisplayDate = (isoStr?: string | null): string => {
  if (!isoStr || isoStr.length < 10) return 'Select Date';
  try {
    const [y, m, d] = isoStr.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return isoStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
};

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select Date',
  minDate,
  presetsType = 'general',
  startDateRef,
  containerStyle,
}) => {
  const { colors, isDark } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse initial date
  const parseInitial = () => {
    if (value && value.length >= 10) {
      const [y, m, d] = value.split('-').map((v) => parseInt(v, 10));
      if (y && m && d) {
        return { year: y, month: m - 1, date: value };
      }
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      date: formatDateToISO(today),
    };
  };

  const initial = parseInitial();
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selectedDate, setSelectedDate] = useState(value || initial.date);

  const openPicker = () => {
    const parsed = parseInitial();
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setSelectedDate(value || parsed.date);
    setModalVisible(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(formatted);
  };

  const handleApply = () => {
    onChange(selectedDate);
    setModalVisible(false);
  };

  const handlePresetSelect = (isoDate: string) => {
    setSelectedDate(isoDate);
    onChange(isoDate);
    setModalVisible(false);
  };

  // Generate days in view month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayISO = formatDateToISO(new Date());

  // Generate Presets
  const getPresets = () => {
    const baseDate = startDateRef && startDateRef.length >= 10
      ? new Date(startDateRef)
      : new Date();

    if (presetsType === 'start') {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      return [
        { label: 'Today', date: formatDateToISO(today) },
        { label: 'Tomorrow', date: formatDateToISO(tomorrow) },
      ];
    } else if (presetsType === 'end') {
      const addDays = (days: number) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + days);
        return formatDateToISO(d);
      };
      return [
        { label: '+3 Days', date: addDays(3) },
        { label: '+5 Days', date: addDays(5) },
        { label: '1 Week', date: addDays(7) },
        { label: '2 Weeks', date: addDays(14) },
        { label: '1 Month', date: addDays(30) },
      ];
    } else {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      return [
        { label: 'Today', date: formatDateToISO(today) },
        { label: '+1 Week', date: formatDateToISO(nextWeek) },
      ];
    }
  };

  const presets = getPresets();

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}

      {/* Main Trigger Button */}
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.triggerBtn,
          {
            backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <CalendarIcon size={15} color={colors.primary} />
          <Text
            style={[
              styles.triggerText,
              { color: value ? colors.text : colors.textMuted },
            ]}
            numberOfLines={1}>
            {value ? formatDisplayDate(value) : placeholder}
          </Text>
        </View>
        <Text style={[styles.triggerHint, { color: colors.primary }]}>Pick ▾</Text>
      </Pressable>

      {/* Interactive Calendar Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />

          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CalendarIcon size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {label || 'Select Date'}
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <CloseIcon size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Selected Date Preview Bar */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: isDark ? colors.surfaceHighlight : colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}>
              <View>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                  Selected Date
                </Text>
                <Text style={[styles.previewDate, { color: colors.primary }]}>
                  {formatDisplayDate(selectedDate)}
                </Text>
              </View>
              <Text style={[styles.isoTag, { color: colors.textMuted }]}>
                {selectedDate}
              </Text>
            </View>

            {/* Quick Presets */}
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Quick Presets
            </Text>
            <View style={styles.presetRow}>
              {presets.map((p) => {
                const isSelected = selectedDate === p.date;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => handlePresetSelect(p.date)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? colors.primary : isDark ? colors.surfaceHighlight : '#F1F5F9',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Month & Year Navigation Bar */}
            <View style={styles.navRow}>
              <Pressable
                onPress={handlePrevMonth}
                style={[styles.navBtn, { borderColor: colors.border }]}>
                <ChevronLeftIcon size={16} color={colors.text} />
              </Pressable>

              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>

              <Pressable
                onPress={handleNextMonth}
                style={[styles.navBtn, { borderColor: colors.border }]}>
                <ChevronRightIcon size={16} color={colors.text} />
              </Pressable>
            </View>

            {/* Weekday Headers */}
            <View style={styles.weekDaysRow}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={[styles.weekDayText, { color: colors.textMuted }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.daysGrid}>
              {/* Empty offset spaces */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellISO = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDate === cellISO;
                const isToday = todayISO === cellISO;
                const isDisabled = minDate ? cellISO < minDate : false;

                return (
                  <Pressable
                    key={`day-${dayNum}`}
                    disabled={isDisabled}
                    onPress={() => handleSelectDay(dayNum)}
                    style={[
                      styles.dayCell,
                      isToday && !isSelected && {
                        borderColor: colors.primary,
                        borderWidth: 1.5,
                      },
                      isSelected && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                      isDisabled && { opacity: 0.3 },
                    ]}>
                    <Text
                      style={[
                        styles.dayText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                        isToday && !isSelected && { color: colors.primary, fontWeight: '800' },
                      ]}>
                      {dayNum}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Set Date"
                variant="primary"
                size="sm"
                icon={<CheckIcon size={14} color="#FFFFFF" />}
                onPress={handleApply}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: 6,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  triggerHint: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  previewLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  previewDate: {
    fontSize: 17,
    fontWeight: '800',
  },
  isoTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.three,
  },
  presetChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: Spacing.three,
  },
  dayCell: {
    width: 38,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
