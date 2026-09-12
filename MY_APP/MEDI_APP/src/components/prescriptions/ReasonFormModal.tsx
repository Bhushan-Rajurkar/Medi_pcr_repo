import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';
import { apiClient } from '@/services/api';
import { CloseIcon, CheckIcon } from '@/components/common/Icons';

export interface ReasonModalData {
  medicineIds: number[];
  reminderIds: number[];
  medicineNames: string[];
}

const COMMON_REASONS = [
  'Experiencing side effects / Unwell',
  'Traveling / Forgot medicine at home',
  'Doctor / Physician instructed to skip',
  'Out of stock / Needs refill',
  'Fasting / Food timing mismatch',
  'Other specific reason',
];

export const ReasonFormModal: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const [visible, setVisible] = useState<boolean>(false);
  const [modalData, setModalData] = useState<ReasonModalData | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Listen for SW messages
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OPEN_REASON_MODAL') {
          openFromPayload(event.data);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // 2. Check URL search params on mount
    if (typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('openReasonModal') === 'true') {
          const medIdsStr = urlParams.get('medicineIds') || '';
          const remIdsStr = urlParams.get('reminderIds') || '';
          const medNamesStr = urlParams.get('medicineNames') || '';

          openFromPayload({
            medicineIds: medIdsStr,
            reminderIds: remIdsStr,
            medicineNames: medNamesStr,
          });

          // Clean URL without refresh
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const openFromPayload = (data: any) => {
    const mIds: number[] = [];
    if (Array.isArray(data.medicineIds)) {
      data.medicineIds.forEach((id: any) => {
        const n = Number(id);
        if (!isNaN(n)) mIds.push(n);
      });
    } else if (typeof data.medicineIds === 'string' && data.medicineIds.trim()) {
      data.medicineIds.split(/[,&]/).forEach((part: string) => {
        const n = Number(part.trim());
        if (!isNaN(n)) mIds.push(n);
      });
    }

    const rIds: number[] = [];
    if (Array.isArray(data.reminderIds)) {
      data.reminderIds.forEach((id: any) => {
        const n = Number(id);
        if (!isNaN(n)) rIds.push(n);
      });
    } else if (typeof data.reminderIds === 'string' && data.reminderIds.trim()) {
      data.reminderIds.split(/[,&]/).forEach((part: string) => {
        const n = Number(part.trim());
        if (!isNaN(n)) rIds.push(n);
      });
    }

    let mNames: string[] = [];
    if (Array.isArray(data.medicineNames)) {
      mNames = data.medicineNames;
    } else if (typeof data.medicineNames === 'string' && data.medicineNames.trim()) {
      mNames = data.medicineNames.split(/[,&]/).map((s: string) => s.trim());
    }

    setModalData({
      medicineIds: mIds,
      reminderIds: rIds,
      medicineNames: mNames,
    });
    setSelectedReason(COMMON_REASONS[0]);
    setCustomNotes('');
    setSuccessMessage(null);
    setVisible(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const finalReason = selectedReason === 'Other specific reason' && customNotes.trim()
        ? customNotes.trim()
        : selectedReason;

      await apiClient.post('/reminders/batch/others', {
        medicineIds: modalData?.medicineIds || [],
        reminderIds: modalData?.reminderIds || [],
        status: 'OTHERS',
        reason: finalReason,
        notes: customNotes.trim() ? customNotes.trim() : finalReason,
      });

      setSuccessMessage('Reason recorded in database successfully.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('MEDISTATUS_UPDATED', { detail: { status: 'OTHERS' } }));
      }
      setTimeout(() => {
        setVisible(false);
        setSubmitting(false);
        setModalData(null);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to submit reason:', err);
      // Fallback to /medistatus/batch-log
      try {
        await apiClient.post('/medistatus/batch-log', {
          medicineIds: modalData?.medicineIds || [],
          reminderIds: modalData?.reminderIds || [],
          status: 'OTHERS',
          reason: selectedReason,
          notes: customNotes.trim() || selectedReason,
        });
        setSuccessMessage('Reason recorded.');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('MEDISTATUS_UPDATED', { detail: { status: 'OTHERS' } }));
        }
        setTimeout(() => {
          setVisible(false);
          setSubmitting(false);
        }, 1200);
      } catch (subErr) {
        alert('Failed to record reason. Please try again.');
        setSubmitting(false);
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>📝 Medication Reason</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Please specify why you are not taking your scheduled dose:
              </Text>
            </View>
            <Pressable onPress={() => setVisible(false)} style={styles.closeBtn}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Medicine Names Display */}
            {modalData?.medicineNames && modalData.medicineNames.length > 0 && (
              <View style={styles.medsContainer}>
                <Text style={[styles.medsLabel, { color: colors.textMuted }]}>MEDICINE(S):</Text>
                <View style={styles.medChips}>
                  {modalData.medicineNames.map((name, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.medChip,
                        {
                          backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9',
                          borderColor: colors.border,
                        },
                      ]}>
                      <Text style={[styles.medChipText, { color: colors.text }]}>💊 {name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Quick Reason Options */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Select Reason Category:
            </Text>
            <View style={styles.reasonList}>
              {COMMON_REASONS.map((reason, idx) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setSelectedReason(reason)}
                    style={[
                      styles.reasonOption,
                      {
                        backgroundColor: isSelected
                          ? colors.primaryLight
                          : isDark
                          ? colors.surfaceHighlight
                          : '#F8FAFC',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.reasonText,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}>
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Detailed Explanation Text Input */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Additional Details / Comments (Optional):
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., Doctor advised 24h rest, feeling nauseous..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={customNotes}
              onChangeText={setCustomNotes}
            />

            {successMessage && (
              <View style={[styles.successBanner, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
                <CheckIcon size={16} color="#059669" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => setVisible(false)}
              style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Reason</Text>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    maxHeight: 400,
    marginBottom: Spacing.three,
  },
  medsContainer: {
    marginBottom: Spacing.three,
  },
  medsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  medChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  medChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  medChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  reasonList: {
    gap: 8,
    marginBottom: Spacing.three,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 10,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  reasonText: {
    fontSize: 13.5,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 10,
    fontSize: 13.5,
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: Spacing.three,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
