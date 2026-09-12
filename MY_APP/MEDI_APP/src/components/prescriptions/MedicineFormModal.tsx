import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { TimePickerInput } from '@/components/common/TimePickerInput';
import { DatePickerInput } from '@/components/common/DatePickerInput';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { useAppTheme } from '@/context/ThemeContext';
import { medicineService, ManualMedicineFormData } from '@/services/medicineService';
import { MedicineResponse } from '@/services/prescriptionService';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  PillIcon,
  ClockIcon,
  CheckIcon,
  ShieldCheckIcon,
} from '@/components/common/Icons';

interface MedicineFormModalProps {
  visible: boolean;
  onClose: () => void;
  medicineToEdit?: MedicineResponse | null;
  onSaved: (saved: MedicineResponse) => void;
}

const MEDI_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Drops', 'Injection', 'Ointment'];
const FOOD_INSTRUCTIONS = ['AFTER_FOOD', 'BEFORE_FOOD', 'WITH_FOOD', 'EMPTY_STOMACH'];
const FREQUENCY_PRESETS = ['1-0-1', '1-0-0', '0-1-0', '0-0-1', '1-1-1', 'Daily', 'As Needed'];
const STATUS_OPTIONS = ['ACTIVE', 'COMPLETED', 'STOPPED'];

export const MedicineFormModal: React.FC<MedicineFormModalProps> = ({
  visible,
  onClose,
  medicineToEdit,
  onSaved,
}) => {
  const { colors, isDark } = useAppTheme();

  const isEditing = !!medicineToEdit;

  // Basic Info
  const [medicineName, setMedicineName] = useState('');
  const [mediStatus, setMediStatus] = useState('Tablet');
  const [foodInstruction, setFoodInstruction] = useState('AFTER_FOOD');
  const [frequency, setFrequency] = useState('1-0-1');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  // Timings
  const [morning, setMorning] = useState(true);
  const [morningTime, setMorningTime] = useState('09:00');

  const [afternoon, setAfternoon] = useState(false);
  const [afternoonTime, setAfternoonTime] = useState('14:00');

  const [evening, setEvening] = useState(false);
  const [eveningTime, setEveningTime] = useState('19:00');

  const [night, setNight] = useState(true);
  const [nightTime, setNightTime] = useState('22:00');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (visible) {
      if (medicineToEdit) {
        setMedicineName(medicineToEdit.medicineName || '');
        setMediStatus(medicineToEdit.mediStatus || 'Tablet');
        setFoodInstruction(medicineToEdit.foodInstruction || 'AFTER_FOOD');
        setFrequency(medicineToEdit.frequency || '1-0-1');
        setTotalQuantity(medicineToEdit.totalQuantity ? String(medicineToEdit.totalQuantity) : '');
        setStartDate(medicineToEdit.startDate || '');
        setEndDate(medicineToEdit.endDate || '');
        setStatus(medicineToEdit.status || 'ACTIVE');

        setMorning(medicineToEdit.morning);
        setMorningTime(medicineToEdit.morningTime ? formatTimeStr(medicineToEdit.morningTime) : '09:00');

        setAfternoon(medicineToEdit.afternoon);
        setAfternoonTime(medicineToEdit.afternoonTime ? formatTimeStr(medicineToEdit.afternoonTime) : '14:00');

        setEvening(medicineToEdit.evening);
        setEveningTime(medicineToEdit.eveningTime ? formatTimeStr(medicineToEdit.eveningTime) : '19:00');

        setNight(medicineToEdit.night);
        setNightTime(medicineToEdit.nightTime ? formatTimeStr(medicineToEdit.nightTime) : '22:00');
      } else {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

        setMedicineName('');
        setMediStatus('Tablet');
        setFoodInstruction('AFTER_FOOD');
        setFrequency('1-0-1');
        setTotalQuantity('14');
        setStartDate(today);
        setEndDate(nextWeek);
        setStatus('ACTIVE');

        setMorning(true);
        setMorningTime('09:00');

        setAfternoon(false);
        setAfternoonTime('14:00');

        setEvening(false);
        setEveningTime('19:00');

        setNight(true);
        setNightTime('22:00');
      }
      setToast(null);
    }
  }, [visible, medicineToEdit]);

  const formatTimeStr = (t: string) => {
    // If it has seconds like 09:00:00, slice to HH:mm
    if (t && t.length >= 5) {
      return t.substring(0, 5);
    }
    return t;
  };

  const handleFrequencyPreset = (preset: string) => {
    setFrequency(preset);
    if (preset === '1-0-1') {
      setMorning(true);
      setAfternoon(false);
      setEvening(false);
      setNight(true);
    } else if (preset === '1-0-0') {
      setMorning(true);
      setAfternoon(false);
      setEvening(false);
      setNight(false);
    } else if (preset === '0-1-0') {
      setMorning(false);
      setAfternoon(true);
      setEvening(false);
      setNight(false);
    } else if (preset === '0-0-1') {
      setMorning(false);
      setAfternoon(false);
      setEvening(false);
      setNight(true);
    } else if (preset === '1-1-1') {
      setMorning(true);
      setAfternoon(true);
      setEvening(false);
      setNight(true);
    }
  };

  const handleSubmit = async () => {
    if (!medicineName.trim()) {
      setToast({ id: 'err_name', type: 'error', message: 'Medicine name is required.' });
      return;
    }

    if (!morning && !afternoon && !evening && !night) {
      setToast({
        id: 'err_slot',
        type: 'error',
        message: 'Please select at least one timing slot (Morning, Afternoon, Evening, or Night).',
      });
      return;
    }

    setLoading(true);
    setToast(null);

    const payload: ManualMedicineFormData = {
      medicineName: medicineName.trim(),
      mediStatus,
      foodInstruction,
      frequency: frequency.trim(),
      status,
      totalQuantity: totalQuantity ? parseInt(totalQuantity, 10) : undefined,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
      morning,
      morningTime: morning ? morningTime.trim() : null,
      afternoon,
      afternoonTime: afternoon ? afternoonTime.trim() : null,
      evening,
      eveningTime: evening ? eveningTime.trim() : null,
      night,
      nightTime: night ? nightTime.trim() : null,
    };

    try {
      let saved: MedicineResponse;
      if (isEditing && medicineToEdit) {
        saved = await medicineService.updateMedicine(medicineToEdit.id, payload);
        setToast({ id: 'ok', type: 'success', message: 'Medicine & timings updated successfully!' });
      } else {
        saved = await medicineService.addMedicine(payload);
        setToast({ id: 'ok', type: 'success', message: 'Medicine added with customized reminders!' });
      }

      onSaved(saved);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setToast({
        id: 'err_api',
        type: 'error',
        message: err.message || 'Failed to save medicine',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit Medicine & Set Timings' : 'Add Medicine Manually'}
      maxWidth={600}>
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Toast toast={toast} onDismiss={() => setToast(null)} />

        {/* Section 1: Medicine Details */}
        <Input
          label="Medicine Name *"
          value={medicineName}
          onChangeText={setMedicineName}
          placeholder="e.g. Paracetamol 500mg, Metformin..."
        />

        {/* Medicine Type Chips */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Medicine Form</Text>
          <View style={styles.chipRow}>
            {MEDI_TYPES.map((type) => {
              const active = mediStatus === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setMediStatus(type)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : isDark ? colors.surfaceHighlight : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Food Instruction Chips */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Food Instruction</Text>
          <View style={styles.chipRow}>
            {FOOD_INSTRUCTIONS.map((inst) => {
              const active = foodInstruction === inst;
              return (
                <Pressable
                  key={inst}
                  onPress={() => setFoodInstruction(inst)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primaryLight : isDark ? colors.surfaceHighlight : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>
                    {inst.replace('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Frequency & Presets */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Frequency</Text>
          <View style={styles.chipRow}>
            {FREQUENCY_PRESETS.map((p) => {
              const active = frequency === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => handleFrequencyPreset(p)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : isDark ? colors.surfaceHighlight : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            value={frequency}
            onChangeText={setFrequency}
            placeholder="Custom frequency (e.g. 1-0-1 or Twice Daily)"
            containerStyle={{ marginTop: Spacing.two }}
          />
        </View>

        {/* Section 2: Interactive Timings & Custom Hours */}
        <View style={[styles.timingContainer, { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC' }]}>
          <View style={styles.timingHeader}>
            <ClockIcon size={18} color={colors.primary} />
            <Text style={[styles.timingTitle, { color: colors.text }]}>
              Customize Daily Dosage & Timings
            </Text>
          </View>
          <Text style={[styles.timingSubtitle, { color: colors.textSecondary }]}>
            Toggle the slots when you take this medicine and customize the exact reminder time.
          </Text>

          {/* Morning Slot */}
          <View style={styles.timingRow}>
            <Pressable
              onPress={() => setMorning(!morning)}
              style={[
                styles.slotToggle,
                {
                  backgroundColor: morning ? colors.primary : isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: morning ? colors.primary : colors.border,
                },
              ]}>
              {morning && <CheckIcon size={14} color="#FFFFFF" />}
              <Text style={[styles.slotToggleText, { color: morning ? '#FFFFFF' : colors.text }]}>
                🌅 Morning
              </Text>
            </Pressable>
            {morning && (
              <TimePickerInput
                value={morningTime}
                onChange={setMorningTime}
                slot="morning"
              />
            )}
          </View>

          {/* Afternoon Slot */}
          <View style={styles.timingRow}>
            <Pressable
              onPress={() => setAfternoon(!afternoon)}
              style={[
                styles.slotToggle,
                {
                  backgroundColor: afternoon ? colors.primary : isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: afternoon ? colors.primary : colors.border,
                },
              ]}>
              {afternoon && <CheckIcon size={14} color="#FFFFFF" />}
              <Text style={[styles.slotToggleText, { color: afternoon ? '#FFFFFF' : colors.text }]}>
                ☀️ Afternoon
              </Text>
            </Pressable>
            {afternoon && (
              <TimePickerInput
                value={afternoonTime}
                onChange={setAfternoonTime}
                slot="afternoon"
              />
            )}
          </View>

          {/* Evening Slot */}
          <View style={styles.timingRow}>
            <Pressable
              onPress={() => setEvening(!evening)}
              style={[
                styles.slotToggle,
                {
                  backgroundColor: evening ? colors.primary : isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: evening ? colors.primary : colors.border,
                },
              ]}>
              {evening && <CheckIcon size={14} color="#FFFFFF" />}
              <Text style={[styles.slotToggleText, { color: evening ? '#FFFFFF' : colors.text }]}>
                🌆 Evening
              </Text>
            </Pressable>
            {evening && (
              <TimePickerInput
                value={eveningTime}
                onChange={setEveningTime}
                slot="evening"
              />
            )}
          </View>

          {/* Night Slot */}
          <View style={styles.timingRow}>
            <Pressable
              onPress={() => setNight(!night)}
              style={[
                styles.slotToggle,
                {
                  backgroundColor: night ? colors.primary : isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: night ? colors.primary : colors.border,
                },
              ]}>
              {night && <CheckIcon size={14} color="#FFFFFF" />}
              <Text style={[styles.slotToggleText, { color: night ? '#FFFFFF' : colors.text }]}>
                🌙 Night
              </Text>
            </Pressable>
            {night && (
              <TimePickerInput
                value={nightTime}
                onChange={setNightTime}
                slot="night"
              />
            )}
          </View>
        </View>

        {/* Section 3: Quantity & Dates */}
        <View style={styles.row}>
          <Input
            label="Total Quantity"
            value={totalQuantity}
            onChangeText={setTotalQuantity}
            placeholder="e.g. 14"
            keyboardType="numeric"
            containerStyle={styles.half}
          />
          <View style={styles.half}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Status</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              {STATUS_OPTIONS.map((st) => {
                const active = status === st;
                return (
                  <Pressable
                    key={st}
                    onPress={() => setStatus(st)}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: active
                          ? st === 'ACTIVE'
                            ? colors.successBg
                            : colors.border
                          : 'transparent',
                        borderColor: active ? colors.success : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: active ? colors.success : colors.textSecondary },
                      ]}>
                      {st}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <DatePickerInput
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            presetsType="start"
            containerStyle={styles.half}
          />
          <DatePickerInput
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate}
            startDateRef={startDate}
            presetsType="end"
            containerStyle={styles.half}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            title={loading ? 'Saving...' : isEditing ? 'Update Medicine' : 'Add Medicine'}
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            style={{ flex: 2 }}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingVertical: Spacing.two,
  },
  fieldGroup: {
    marginBottom: Spacing.three,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  timingContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    marginTop: Spacing.two,
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  timingSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  slotToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 140,
  },
  slotToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  half: {
    flex: 1,
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
});
