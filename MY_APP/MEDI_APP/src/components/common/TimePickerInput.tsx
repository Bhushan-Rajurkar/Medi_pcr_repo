import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { ClockIcon, CheckIcon, CloseIcon } from '@/components/common/Icons';
import { Button } from '@/components/common/Button';

interface TimePickerInputProps {
  value: string; // HH:mm format (e.g. "09:00", "14:30")
  onChange: (time24: string) => void;
  label?: string;
  slot?: 'morning' | 'afternoon' | 'evening' | 'night';
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const SLOT_PRESETS: Record<string, string[]> = {
  morning: ['07:00', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30'],
  afternoon: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'],
  evening: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
  night: ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30'],
};

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChange,
  label,
  slot,
}) => {
  const { colors, isDark } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse current 24-hr time into 12-hr parts
  const parse24 = (timeStr: string) => {
    let [h, m] = (timeStr || '09:00').split(':').map((v) => parseInt(v, 10) || 0);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return { hour12, minute: m, ampm };
  };

  const current = parse24(value);
  const [selectedHour, setSelectedHour] = useState(current.hour12);
  const [selectedMinute, setSelectedMinute] = useState(current.minute);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>(current.ampm as 'AM' | 'PM');

  const openPicker = () => {
    const parsed = parse24(value);
    setSelectedHour(parsed.hour12);
    setSelectedMinute(parsed.minute);
    setSelectedAmPm(parsed.ampm as 'AM' | 'PM');
    setModalVisible(true);
  };

  const handleApply = () => {
    let h24 = selectedHour;
    if (selectedAmPm === 'AM') {
      h24 = selectedHour === 12 ? 0 : selectedHour;
    } else {
      h24 = selectedHour === 12 ? 12 : selectedHour + 12;
    }
    const formatted = `${String(h24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(formatted);
    setModalVisible(false);
  };

  const handlePresetSelect = (time24: string) => {
    onChange(time24);
    setModalVisible(false);
  };

  // Human readable display: e.g. "09:00 AM"
  const formatDisplay = (time24: string) => {
    const { hour12, minute, ampm } = parse24(time24);
    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
  };

  const presets = slot && SLOT_PRESETS[slot] ? SLOT_PRESETS[slot] : ['09:00', '14:00', '19:00', '22:00'];

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}

      {/* Main interactive button to set time */}
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
        <ClockIcon size={16} color={colors.primary} />
        <Text style={[styles.triggerText, { color: colors.text }]}>
          {formatDisplay(value)}
        </Text>
        <Text style={[styles.triggerHint, { color: colors.primary }]}>Set ▾</Text>
      </Pressable>

      {/* Interactive Time Picker Modal */}
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
                <ClockIcon size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Set Timing
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <CloseIcon size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Time Preview Box */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: isDark ? colors.surfaceHighlight : colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={[styles.previewTime, { color: colors.text }]}>
                  {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                  {selectedAmPm}
                </Text>
              </View>

              {/* AM / PM Segmented Control */}
              <View style={[styles.ampmSwitch, { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF' }]}>
                <Pressable
                  onPress={() => setSelectedAmPm('AM')}
                  style={[
                    styles.ampmBtn,
                    selectedAmPm === 'AM' && { backgroundColor: colors.primary },
                  ]}>
                  <Text
                    style={[
                      styles.ampmText,
                      { color: selectedAmPm === 'AM' ? '#FFFFFF' : colors.textSecondary },
                    ]}>
                    AM
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedAmPm('PM')}
                  style={[
                    styles.ampmBtn,
                    selectedAmPm === 'PM' && { backgroundColor: colors.primary },
                  ]}>
                  <Text
                    style={[
                      styles.ampmText,
                      { color: selectedAmPm === 'PM' ? '#FFFFFF' : colors.textSecondary },
                    ]}>
                    PM
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Quick 1-Tap Presets */}
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Quick Presets
            </Text>
            <View style={styles.presetWrap}>
              {presets.map((preset) => {
                const isSelected = value === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => handlePresetSelect(preset)}
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
                      {formatDisplay(preset)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Select Hour (1-12) */}
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Select Hour
            </Text>
            <View style={styles.gridWrap}>
              {HOURS_12.map((h) => {
                const active = selectedHour === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => setSelectedHour(h)}
                    style={[
                      styles.circleBtn,
                      {
                        backgroundColor: active ? colors.primary : isDark ? colors.surfaceHighlight : '#F8FAFC',
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.circleBtnText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}>
                      {h}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Select Minute */}
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Select Minute
            </Text>
            <View style={styles.gridWrap}>
              {MINUTES.map((m) => {
                const active = selectedMinute === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setSelectedMinute(m)}
                    style={[
                      styles.minuteBtn,
                      {
                        backgroundColor: active ? colors.primary : isDark ? colors.surfaceHighlight : '#F8FAFC',
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.minuteBtnText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}>
                      :{String(m).padStart(2, '0')}
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
                title="Set Time"
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
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 11,
    marginBottom: 2,
    fontWeight: '600',
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minWidth: 130,
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 13.5,
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
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    ...Shadows.lg,
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
    marginBottom: Spacing.three,
  },
  previewTime: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ampmSwitch: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  ampmBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
  },
  ampmText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.two,
  },
  presetChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.two,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  minuteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
  },
  minuteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
});
