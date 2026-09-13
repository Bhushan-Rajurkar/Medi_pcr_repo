import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {
  prescriptionService,
  PrescriptionResponse,
  MedicineResponse,
  ReminderResponse,
} from '@/services/prescriptionService';
import { medicineService } from '@/services/medicineService';
import { MedicineFormModal } from './MedicineFormModal';
import { ReminderNotificationCard } from '@/components/profile/ReminderNotificationCard';
import { MediStatusVisualReport } from './MediStatusVisualReport';
import { notifyMediStatusUpdated } from '@/services/mediStatusService';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { formatDisplayDate } from '@/components/common/DatePickerInput';
import {
  PillIcon,
  ClockIcon,
  CalendarIcon,
  TrashIcon,
  CheckIcon,
  DoctorIcon,
  UserIcon,
  RefreshIcon,
  ShieldCheckIcon,
  BarChartIcon,
} from '@/components/common/Icons';
import { BorderRadius, Spacing } from '@/constants/theme';

type PrescriptionSubTab = 'history' | 'medicines' | 'reminders' | 'reports';

const formatTimeTo12Hour = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  if (isNaN(h)) return timeStr;
  const m = parts[1].slice(0, 2);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const renderSlotBadge = (status?: string, isDark?: boolean) => {
  const s = (status || 'PENDING').toUpperCase();
  let bg = isDark ? '#1E293B' : '#F1F5F9';
  let text = isDark ? '#94A3B8' : '#64748B';

  if (s === 'TAKEN' || s === 'TAKE') {
    bg = isDark ? '#064E3B' : '#D1FAE5';
    text = isDark ? '#6EE7B7' : '#047857';
  } else if (s === 'SNOOZE' || s === 'SNOOZED') {
    bg = isDark ? '#78350F' : '#FEF3C7';
    text = isDark ? '#FCD34D' : '#B45309';
  } else if (s === 'POSTPONE' || s === 'POSTPONED') {
    bg = isDark ? '#1E3A8A' : '#DBEAFE';
    text = isDark ? '#93C5FD' : '#1D4ED8';
  } else if (s === 'MISSED' || s === 'DISMISSED' || s === 'DISMISS') {
    bg = isDark ? '#450A0A' : '#FEE2E2';
    text = isDark ? '#FCA5A5' : '#B91C1C';
  }

  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 4,
        backgroundColor: bg,
        marginLeft: 4,
        alignSelf: 'center',
      }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: text }}>{s}</Text>
    </View>
  );
};

interface PrescriptionListProps {
  onOpenScanner?: () => void;
  onOpenAuth?: () => void;
}

export const PrescriptionList: React.FC<PrescriptionListProps> = ({
  onOpenScanner,
  onOpenAuth,
}) => {
  const { colors, isDark } = useAppTheme();
  const { isAuthenticated } = useAuth();
  const { isSmallMobile, isMobile } = useResponsive();

  const [subTab, setSubTab] = useState<PrescriptionSubTab>('history');
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [medicines, setMedicines] = useState<MedicineResponse[]>([]);
  const [reminders, setReminders] = useState<ReminderResponse[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [medFilter, setMedFilter] = useState<string>('ALL');

  const [medicineModalVisible, setMedicineModalVisible] = useState<boolean>(false);
  const [selectedMedToEdit, setSelectedMedToEdit] = useState<MedicineResponse | null>(null);

  const handleDeleteMedicine = async (id: number) => {
    try {
      await medicineService.deleteMedicine(id);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      setToast({ id: 'del_ok', type: 'success', message: 'Medicine deleted successfully.' });
      notifyMediStatusUpdated({ action: 'DELETE_MEDICINE', id });
    } catch (err: any) {
      setToast({ id: 'del_err', type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const loadData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      if (subTab === 'history') {
        const data = await prescriptionService.getMyPrescriptions();
        setPrescriptions(data);
      } else if (subTab === 'medicines') {
        const filter = medFilter === 'ALL' ? undefined : medFilter;
        const data = await prescriptionService.getUserMedicines(filter);
        setMedicines(data);
      } else if (subTab === 'reminders') {
        const data = await prescriptionService.getTodayReminders();
        setReminders(data);
      }
    } catch (err: any) {
      console.error('Error fetching prescription data:', err);
      setToast({ id: 'fetch_err', type: 'error', message: err.message || 'Failed to load records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab, medFilter, isAuthenticated]);

  const handleDeletePrescription = async (id: number) => {
    try {
      await prescriptionService.deletePrescription(id);
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
      setMedicines((prev) => prev.filter((m) => m.prescriptionId !== id));
      setToast({ id: 'del_ok', type: 'success', message: 'Prescription and associated medicines deleted successfully.' });
      notifyMediStatusUpdated({ action: 'DELETE_PRESCRIPTION', id });
    } catch (err: any) {
      setToast({ id: 'del_err', type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const handleUpdateMedStatus = async (medId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'COMPLETED' : currentStatus === 'COMPLETED' ? 'STOPPED' : 'ACTIVE';
    try {
      const updated = await prescriptionService.updateMedicineStatus(medId, nextStatus);
      setMedicines((prev) =>
        prev.map((m) => (m.id === medId ? { ...m, status: updated.status } : m))
      );
      setToast({
        id: 'status_ok',
        type: 'success',
        message: `Status updated to ${nextStatus}`,
      });
      notifyMediStatusUpdated({ action: 'UPDATE_MED_STATUS', medId, status: nextStatus });
    } catch (err: any) {
      setToast({ id: 'status_err', type: 'error', message: err.message || 'Status update failed' });
    }
  };

  if (!isAuthenticated) {
    return (
      <View
        style={[
          styles.unauthCard,
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}>
        <ShieldCheckIcon size={36} color={colors.primary} />
        <Text style={[styles.unauthTitle, { color: colors.text }]}>Sign In to View Prescriptions</Text>
        <Text style={[styles.unauthSub, { color: colors.textSecondary }]}>
          Prescription history and medication schedules are encrypted and tied to your account.
        </Text>
        <Button title="Sign In / Register" onPress={onOpenAuth || (() => {})} style={{ marginTop: Spacing.two }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Sub Navigation Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: Spacing.four }}
        contentContainerStyle={{ minWidth: '100%' }}>
        <View
          style={[
            styles.subTabBar,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: colors.border,
              flex: 1,
              marginBottom: 0,
            },
          ]}>
          <Pressable
            onPress={() => setSubTab('history')}
            style={[
              styles.subTabBtn,
              { paddingHorizontal: isSmallMobile ? 8 : 12 },
              subTab === 'history' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.subTabText,
                {
                  color: subTab === 'history' ? colors.primary : colors.textSecondary,
                  fontWeight: subTab === 'history' ? '700' : '500',
                  fontSize: isSmallMobile ? 11.5 : 13,
                },
              ]}>
              Prescriptions ({prescriptions.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSubTab('medicines')}
            style={[
              styles.subTabBtn,
              { paddingHorizontal: isSmallMobile ? 8 : 12 },
              subTab === 'medicines' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.subTabText,
                {
                  color: subTab === 'medicines' ? colors.primary : colors.textSecondary,
                  fontWeight: subTab === 'medicines' ? '700' : '500',
                  fontSize: isSmallMobile ? 11.5 : 13,
                },
              ]}>
              Active Medicines
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSubTab('reminders')}
            style={[
              styles.subTabBtn,
              { paddingHorizontal: isSmallMobile ? 8 : 12 },
              subTab === 'reminders' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.subTabText,
                {
                  color: subTab === 'reminders' ? colors.primary : colors.textSecondary,
                  fontWeight: subTab === 'reminders' ? '700' : '500',
                  fontSize: isSmallMobile ? 11.5 : 13,
                },
              ]}>
              Today's Reminders
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSubTab('reports')}
            style={[
              styles.subTabBtn,
              { paddingHorizontal: isSmallMobile ? 8 : 12 },
              subTab === 'reports' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.subTabText,
                {
                  color: subTab === 'reports' ? colors.primary : colors.textSecondary,
                  fontWeight: subTab === 'reports' ? '700' : '500',
                  fontSize: isSmallMobile ? 11.5 : 13,
                },
              ]}>
              Adherence Reports
            </Text>
          </Pressable>
        </View>
      </ScrollView>


      {/* Loading state */}
      {loading && (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading records...</Text>
        </View>
      )}

      {/* SUB-VIEW 1: PRESCRIPTIONS LIST */}
      {!loading && subTab === 'history' && (
        <View>
          {prescriptions.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <PillIcon size={38} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Prescriptions Recorded</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Scan your first prescription image with the AI Scanner to track medications automatically.
              </Text>
              {onOpenScanner && (
                <Button title="Open AI Scanner" size="sm" onPress={onOpenScanner} style={{ marginTop: Spacing.two }} />
              )}
            </View>
          ) : (
            prescriptions.map((pres) => (
              <View
                key={pres.id}
                style={[
                  styles.presCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.presCardHeader}>
                  <View>
                    <Text style={[styles.presIdText, { color: colors.text }]}>
                      Prescription #{pres.externalPrescriptionId || pres.id}
                    </Text>
                    <Text style={[styles.presDateText, { color: colors.textSecondary }]}>
                      Date: {pres.prescriptionDate || pres.uploadDate || 'Recent'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleDeletePrescription(pres.id)}
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}>
                    <TrashIcon size={18} color={colors.danger} />
                  </Pressable>
                </View>

                {/* Patient & Doctor Preview */}
                <View style={styles.presMetaRow}>
                  {pres.patient?.name && (
                    <View style={styles.metaPill}>
                      <UserIcon size={14} color={colors.primary} />
                      <Text style={[styles.metaPillText, { color: colors.text }]}>
                        Patient: {pres.patient.name}
                      </Text>
                    </View>
                  )}
                  {pres.doctor?.doctorNames && (
                    <View style={styles.metaPill}>
                      <DoctorIcon size={14} color={colors.primary} />
                      <Text style={[styles.metaPillText, { color: colors.text }]}>
                        Doctor: {pres.doctor.doctorNames}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Medicines List in Prescription */}
                <View style={styles.medsSummaryList}>
                  <Text style={[styles.medsSummaryTitle, { color: colors.textSecondary }]}>
                    Medicines ({pres.medicines?.length || 0}):
                  </Text>
                  {pres.medicines?.map((m) => (
                    <View
                      key={m.id}
                      style={[
                        styles.medItemMini,
                        { backgroundColor: isDark ? colors.surfaceHighlight : colors.surface },
                      ]}>
                      <Text style={[styles.medItemMiniName, { color: colors.text }]}>
                        {m.medicineName}
                      </Text>
                      <View style={styles.timingMiniPills}>
                        <Text style={[styles.timingMiniText, { color: m.morning ? colors.success : colors.textMuted }]}>
                          M: {m.morning ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.timingMiniText, { color: m.afternoon ? colors.success : colors.textMuted }]}>
                          A: {m.afternoon ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.timingMiniText, { color: m.evening ? colors.success : colors.textMuted }]}>
                          E: {m.evening ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.timingMiniText, { color: m.night ? colors.success : colors.textMuted }]}>
                          N: {m.night ? '✓' : '✗'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* SUB-VIEW 2: MEDICINES WITH STATUS TOGGLE */}
      {!loading && subTab === 'medicines' && (
        <View>
          {/* Top Bar: Status Filter Chips + Add Medicine Manually Button */}
          <View style={styles.medTopBar}>
            <View style={styles.filterChipsRow}>
              {['ALL', 'ACTIVE', 'COMPLETED', 'STOPPED'].map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => setMedFilter(filter)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: medFilter === filter ? colors.primary : isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: medFilter === filter ? (isDark ? '#0E1612' : '#FFFFFF') : colors.text },
                    ]}>
                    {filter}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Button
              title="+ Add Medicine Manually"
              variant="primary"
              size="sm"
              icon={<PillIcon size={14} color="#FFFFFF" />}
              onPress={() => {
                setSelectedMedToEdit(null);
                setMedicineModalVisible(true);
              }}
            />
          </View>

          {medicines.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <PillIcon size={38} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Medicines Found</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No medicines match the selected status.
              </Text>
              <Button
                title="+ Add First Medicine Manually"
                variant="primary"
                size="sm"
                onPress={() => {
                  setSelectedMedToEdit(null);
                  setMedicineModalVisible(true);
                }}
                style={{ marginTop: Spacing.two }}
              />
            </View>
          ) : (
            medicines.map((med) => (
              <View
                key={med.id}
                style={[
                  styles.medCardFull,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.medCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medCardName, { color: colors.text }]}>{med.medicineName}</Text>
                    <Text style={[styles.medCardFreq, { color: colors.textSecondary }]}>
                      Form: {med.mediStatus || 'Tablet'} • Frequency: {med.frequency || '1-0-1'} • {med.foodInstruction || 'AFTER_FOOD'}
                    </Text>
                    {(med.startDate || med.endDate) && (
                      <Text style={[styles.medCardFreq, { color: colors.textMuted, marginTop: 2 }]}>
                        📅 {med.startDate ? formatDisplayDate(med.startDate) : 'Today'} → {med.endDate ? formatDisplayDate(med.endDate) : 'Ongoing'}
                      </Text>
                    )}
                  </View>

                  {/* Interactive Status Button */}
                  <Pressable
                    onPress={() => handleUpdateMedStatus(med.id, med.status)}
                    style={[
                      styles.statusToggleBtn,
                      {
                        backgroundColor:
                          med.status === 'ACTIVE'
                            ? colors.successBg
                            : med.status === 'COMPLETED'
                            ? isDark ? '#2A2515' : '#FEF3C7'
                            : isDark ? '#3B1A1A' : '#FEE2E2',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusToggleBtnText,
                        {
                          color:
                            med.status === 'ACTIVE'
                              ? colors.success
                              : med.status === 'COMPLETED'
                              ? isDark ? '#FBBF24' : '#B45309'
                              : colors.danger,
                        },
                      ]}>
                      {med.status} (Click to Change)
                    </Text>
                  </Pressable>
                </View>

                {/* Timing Pills with Slot Adherence Status */}
                <View
                  style={[
                    styles.timingGridSmall,
                    { backgroundColor: isDark ? colors.surfaceHighlight : colors.surface },
                  ]}>
                  <View style={styles.slotRow}>
                    <Text style={[styles.timingSlotItem, { color: colors.text }]}>
                      Morning: <Text style={{ fontWeight: '700', color: med.morning ? colors.success : colors.textMuted }}>{med.morning ? '✓ ' + formatTimeTo12Hour(med.morningTime || '09:00') : '✗'}</Text>
                    </Text>
                    {med.morning && renderSlotBadge(med.morningStatus, isDark)}
                  </View>

                  <View style={styles.slotRow}>
                    <Text style={[styles.timingSlotItem, { color: colors.text }]}>
                      Afternoon: <Text style={{ fontWeight: '700', color: med.afternoon ? colors.success : colors.textMuted }}>{med.afternoon ? '✓ ' + formatTimeTo12Hour(med.afternoonTime || '14:00') : '✗'}</Text>
                    </Text>
                    {med.afternoon && renderSlotBadge(med.afternoonStatus, isDark)}
                  </View>

                  <View style={styles.slotRow}>
                    <Text style={[styles.timingSlotItem, { color: colors.text }]}>
                      Evening: <Text style={{ fontWeight: '700', color: med.evening ? colors.success : colors.textMuted }}>{med.evening ? '✓ ' + formatTimeTo12Hour(med.eveningTime || '19:00') : '✗'}</Text>
                    </Text>
                    {med.evening && renderSlotBadge(med.eveningStatus, isDark)}
                  </View>

                  <View style={styles.slotRow}>
                    <Text style={[styles.timingSlotItem, { color: colors.text }]}>
                      Night: <Text style={{ fontWeight: '700', color: med.night ? colors.success : colors.textMuted }}>{med.night ? '✓ ' + formatTimeTo12Hour(med.nightTime || '22:00') : '✗'}</Text>
                    </Text>
                    {med.night && renderSlotBadge(med.nightStatus, isDark)}
                  </View>
                </View>

                {/* Edit Timings & Details / Delete Actions */}
                <View style={[styles.medCardActionsRow, { borderTopColor: colors.border }]}>
                  <Button
                    title="Edit Timings & Details"
                    variant="outline"
                    size="sm"
                    icon={<ClockIcon size={14} color={colors.primary} />}
                    onPress={() => {
                      setSelectedMedToEdit(med);
                      setMedicineModalVisible(true);
                    }}
                  />
                  <Button
                    title="Delete"
                    variant="ghost"
                    size="sm"
                    icon={<TrashIcon size={14} color={colors.danger} />}
                    onPress={() => handleDeleteMedicine(med.id)}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* SUB-VIEW 3: TODAY'S SCHEDULED REMINDERS */}
      {!loading && subTab === 'reminders' && (
        <View>
          <ReminderNotificationCard />

          {reminders.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <ClockIcon size={38} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reminders for Today</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No scheduled medication alerts are active for today's date.
              </Text>
            </View>
          ) : (
            reminders.map((rem) => (
              <View
                key={rem.id}
                style={[
                  styles.reminderCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                    borderColor: colors.border,
                    borderLeftColor: colors.primary,
                  },
                ]}>
                <View style={styles.reminderTimeBox}>
                  <ClockIcon size={16} color={colors.primary} />
                  <Text style={[styles.reminderTimeText, { color: colors.text }]}>
                    {formatTimeTo12Hour(rem.reminderTime)}
                  </Text>
                  <Text style={[styles.reminderSlotText, { color: colors.textSecondary }]}>
                    {rem.slot}
                  </Text>
                </View>

                <View style={styles.reminderContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <Text style={[styles.reminderMedName, { color: colors.text }]}>
                      {rem.medicineName}
                    </Text>
                    {renderSlotBadge(rem.mediStatus, isDark)}
                  </View>
                  <Text style={[styles.reminderInstruction, { color: colors.textSecondary }]}>
                    Take {rem.foodInstruction ? rem.foodInstruction.replace('_', ' ') : 'with water'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* SUB-VIEW 4: MEDISTATUS VISUAL ADHERENCE REPORT */}
      {!loading && subTab === 'reports' && (
        <MediStatusVisualReport />
      )}

      {/* Manual Medicine Add / Edit Modal */}

      <MedicineFormModal
        visible={medicineModalVisible}
        onClose={() => {
          setMedicineModalVisible(false);
          setSelectedMedToEdit(null);
        }}
        medicineToEdit={selectedMedToEdit}
        onSaved={() => {
          loadData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  unauthCard: {
    padding: Spacing.five,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
    gap: Spacing.two,
  },
  unauthTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  unauthSub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 18,
  },
  subTabBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.one,
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    cursor: 'pointer' as any,
  },
  subTabText: {
    fontSize: 13,
  },
  loadingWrapper: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 13.5,
  },
  emptyBox: {
    padding: Spacing.five,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: Spacing.one * 1.5,
    marginVertical: Spacing.two,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 18,
  },
  presCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  presCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  presIdText: {
    fontSize: 15,
    fontWeight: '700',
  },
  presDateText: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: Spacing.one,
    cursor: 'pointer' as any,
  },
  presMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaPillText: {
    fontSize: 12.5,
  },
  medsSummaryList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  medsSummaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  medItemMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.sm,
  },
  medItemMiniName: {
    fontSize: 13,
    fontWeight: '600',
  },
  timingMiniPills: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  timingMiniText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medCardFull: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  medCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  medCardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  medCardFreq: {
    fontSize: 12,
    marginTop: 2,
  },
  statusToggleBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.full,
    cursor: 'pointer' as any,
  },
  statusToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timingGridSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
  },
  timingSlotItem: {
    fontSize: 12,
    marginRight: 2,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.three,
    marginVertical: 2,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.three,
    marginBottom: Spacing.two * 1.5,
    gap: Spacing.three,
  },
  reminderTimeBox: {
    alignItems: 'center',
    minWidth: 65,
  },
  reminderTimeText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  reminderSlotText: {
    fontSize: 11,
  },
  reminderContent: {
    flex: 1,
  },
  reminderMedName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  reminderInstruction: {
    fontSize: 12,
    marginTop: 2,
  },
  medTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  medCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
});
