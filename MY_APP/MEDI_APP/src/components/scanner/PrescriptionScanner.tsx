import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import {
  geminiService,
  ExtractedPrescription,
  BackendPrescriptionPayload,
  DEFAULT_GEMINI_KEY,
} from '@/services/geminiService';
import { prescriptionService } from '@/services/prescriptionService';
import { filePicker, PickedFile } from '@/utils/filePicker';
import { formatDisplayDate } from '@/components/common/DatePickerInput';
import {
  UploadCloudIcon,
  ScanIcon,
  CheckIcon,
  CloseIcon,
  PillIcon,
  HeartPulseIcon,
  DoctorIcon,
  UserIcon,
  ClockIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from '@/components/common/Icons';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

const formatTimeTo12Hour = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  if (isNaN(h)) return timeStr;
  const m = parts[1].slice(0, 2);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

interface PrescriptionScannerProps {
  onSavedSuccess?: () => void;
  onOpenAuth?: () => void;
}

export const PrescriptionScanner: React.FC<PrescriptionScannerProps> = ({
  onSavedSuccess,
  onOpenAuth,
}) => {
  const { colors, isDark } = useAppTheme();
  const { isAuthenticated } = useAuth();
  const { isSmallMobile, isMobile } = useResponsive();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');

  const [extracting, setExtracting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [extractedData, setExtractedData] = useState<ExtractedPrescription | null>(null);
  const [backendPayload, setBackendPayload] = useState<BackendPrescriptionPayload | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Handle cross-platform picked file (Android, iOS & Web)
  const handlePickedFile = async (picked: PickedFile) => {
    setImagePreview(picked.uri);
    setMimeType(picked.mimeType || 'image/jpeg');

    let b64 = picked.base64;
    if (!b64) {
      if (picked.file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const cleanB64 = result.split(',')[1];
          setBase64Image(cleanB64);
        };
        reader.readAsDataURL(picked.file);
      } else {
        try {
          const response = await fetch(picked.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const cleanB64 = result.split(',')[1];
            setBase64Image(cleanB64);
          };
          reader.readAsDataURL(blob);
        } catch (e) {
          console.error('Failed to convert image to base64:', e);
        }
      }
    } else {
      setBase64Image(b64);
    }

    setExtractedData(null);
    setBackendPayload(null);
    setSaveSuccess(false);
  };

  const handleChooseGallery = async () => {
    try {
      const picked = await filePicker.pickImage();
      if (picked) {
        await handlePickedFile(picked);
      }
    } catch (err: any) {
      setToast({ id: 'pick_err', type: 'error', message: err.message || 'Could not pick image from device.' });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const picked = await filePicker.takePhoto();
      if (picked) {
        await handlePickedFile(picked);
      }
    } catch (err: any) {
      setToast({ id: 'cam_err', type: 'error', message: err.message || 'Could not open camera on device.' });
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    handlePickedFile({
      uri: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      mimeType: file.type || 'image/jpeg',
      file,
    });
  };

  // Step 1: Run Gemini AI Extraction
  const handleExtract = async () => {
    if (!base64Image) {
      setToast({ id: 'no_img', type: 'error', message: 'Please select a prescription image first.' });
      return;
    }

    setExtracting(true);
    setToast(null);
    setSaveSuccess(false);

    try {
      const { visualData, backendPayload: payload } = await geminiService.extractPrescription(
        base64Image,
        mimeType,
        DEFAULT_GEMINI_KEY
      );
      setExtractedData(visualData);
      setBackendPayload(payload);
      setToast({
        id: 'ext_ok',
        type: 'success',
        message: 'Prescription scanned successfully! Review details below.',
      });
    } catch (err: any) {
      console.error('Gemini extraction error:', err);
      setToast({
        id: 'ext_err',
        type: 'error',
        message: err.message || 'AI extraction failed. Please try a clearer image.',
      });
    } finally {
      setExtracting(false);
    }
  };

  // Step 2: One-Click Save to Spring Boot Backend API
  const handleSaveToDatabase = async () => {
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      setToast({ id: 'auth_req', type: 'warning', message: 'Please sign in to save prescriptions.' });
      return;
    }

    if (!backendPayload) {
      setToast({ id: 'no_data', type: 'error', message: 'No extracted prescription data available to save.' });
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      await prescriptionService.savePrescription(backendPayload);
      setSaveSuccess(true);
      setToast({
        id: 'save_ok',
        type: 'success',
        message: 'Prescription and scheduled reminders saved to database!',
      });
      if (onSavedSuccess) {
        onSavedSuccess();
      }
    } catch (err: any) {
      console.error('Backend save error:', err);
      setToast({
        id: 'save_err',
        type: 'error',
        message: err.message || 'Failed to save to database. Please check your connection.',
      });
    } finally {
      setSaving(false);
    }
  };

  // One-Click Scan & Save (direct automation)
  const handleScanAndSave = async () => {
    if (!base64Image) {
      setToast({ id: 'no_img', type: 'error', message: 'Please select a prescription image first.' });
      return;
    }
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      setToast({ id: 'auth_req', type: 'warning', message: 'Please sign in first.' });
      return;
    }

    setExtracting(true);
    setToast(null);

    try {
      const { visualData, backendPayload: payload } = await geminiService.extractPrescription(
        base64Image,
        mimeType,
        DEFAULT_GEMINI_KEY
      );
      setExtractedData(visualData);
      setBackendPayload(payload);

      setExtracting(false);
      setSaving(true);

      await prescriptionService.savePrescription(payload);
      setSaveSuccess(true);
      setToast({
        id: 'direct_ok',
        type: 'success',
        message: 'Prescription scanned and saved to database successfully in one click!',
      });
      if (onSavedSuccess) onSavedSuccess();
    } catch (err: any) {
      setToast({
        id: 'direct_err',
        type: 'error',
        message: err.message || 'Scan & save operation failed.',
      });
    } finally {
      setExtracting(false);
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Upload & AI Scanner Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}>
        <View style={styles.cardHeader}>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.primaryLight }]}>
            <ScanIcon size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              AI Prescription Scanner (Gemini Flash)
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Select prescription image to automatically deduce medication schedules, frequencies, and dosages.
            </Text>
          </View>
        </View>

        {/* Universal Prescription Image Selector (Android, iOS & Web) */}
        <View
          style={[
            styles.dropzone,
            {
              backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
              borderColor: imagePreview ? colors.primary : colors.border,
            },
          ]}>
          {Platform.OS === 'web' && (
            <input
              type="file"
              id="prescription-file-input"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          )}

          <UploadCloudIcon size={44} color={colors.primary} />
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.primary,
              marginTop: 8,
              textAlign: 'center',
            }}>
            {imagePreview ? 'Prescription Selected' : 'Select Prescription Image / Photo'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 14, textAlign: 'center' }}>
            Reads locally in memory — AI will deduce medications, dosages & schedules
          </Text>

          {/* Action buttons for Android / Web / iOS */}
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              title="📁 Choose Image"
              variant="outline"
              size="sm"
              onPress={handleChooseGallery}
            />
            <Button
              title="📷 Take Photo"
              variant="outline"
              size="sm"
              onPress={handleTakePhoto}
            />
          </View>
        </View>

        {/* Preview image if loaded */}
        {imagePreview && (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: imagePreview }} style={styles.previewImage} resizeMode="contain" />
            <Pressable
              onPress={() => {
                setImagePreview(null);
                setBase64Image(null);
                setExtractedData(null);
                setBackendPayload(null);
                setSaveSuccess(false);
              }}
              style={{ marginTop: 8, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '600' }}>
                ✕ Remove Image
              </Text>
            </Pressable>
          </View>
        )}

        {/* Action Button Bar */}
        <View style={styles.buttonRow}>
          <Button
            title={extracting ? 'Scanning with Gemini AI...' : 'Extract Prescription Data'}
            variant="primary"
            size="md"
            icon={<ScanIcon size={16} color={isDark ? '#0E1612' : '#FFFFFF'} />}
            disabled={!base64Image || extracting || saving}
            loading={extracting}
            onPress={handleExtract}
          />
          <Button
            title={saving ? 'Processing...' : '⚡ 1-Click Scan & Save'}
            variant="secondary"
            size="md"
            disabled={!base64Image || extracting || saving}
            onPress={handleScanAndSave}
          />
        </View>
      </View>

      {/* Loading Spinner */}
      {extracting && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>
            Analyzing Prescription with Gemini 2.5 Flash...
          </Text>
          <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
            Deducing frequencies, medicine timings, and duration rules
          </Text>
        </View>
      )}

      {/* STEP 2: PARSED CONTEXT DETAILS (VISUAL & NUMERICAL FORMAT - NO RAW JSON) */}
      {extractedData && !extracting && (
        <View style={styles.resultsContainer}>
          {/* Section 1: Patient & Doctor Cards */}
          <View style={styles.metadataGrid}>
            {/* Patient Card */}
            <View
              style={[
                styles.dataBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <View style={styles.dataBoxHeader}>
                <UserIcon size={18} color={colors.primary} />
                <Text style={[styles.dataBoxTitle, { color: colors.primary }]}>
                  Patient Demographics
                </Text>
              </View>

              <View style={styles.infoList}>
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Full Name</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.patient.name || 'Not Specified'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Age & Gender</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.patient.age || '--'} yrs • {extractedData.patient.gender || '--'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Blood Pressure</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.patient.bp || '--'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Heart Rate</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.patient.heartRate ? `${extractedData.patient.heartRate} bpm` : '--'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Body Weight</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.patient.weight ? `${extractedData.patient.weight} kg` : '--'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Allergies</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.patient.allergies || 'None'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Doctor Card */}
            <View
              style={[
                styles.dataBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <View style={styles.dataBoxHeader}>
                <DoctorIcon size={18} color={colors.primary} />
                <Text style={[styles.dataBoxTitle, { color: colors.primary }]}>
                  Physician & Clinic
                </Text>
              </View>

              <View style={styles.infoList}>
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Doctor Name</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.doctor.doctorNames?.join(', ') || 'Attending Physician'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Clinic / Hospital</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.doctor.clinicName || 'Clinic'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Address</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.doctor.address || 'Address on file'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Contact</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {extractedData.doctor.contactNumber || '--'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Section 2: Prescribed Medications Visual List */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                borderColor: colors.border,
                marginTop: Spacing.four,
              },
            ]}>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconWrap, { backgroundColor: colors.primaryLight }]}>
                <PillIcon size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Prescribed Medications ({extractedData.medicines.length})
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Verified against customized frequency and duration rules.
                </Text>
              </View>
            </View>

            {extractedData.medicines.map((med, index) => (
              <View
                key={index}
                style={[
                  styles.medicationCard,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: colors.primary,
                  },
                ]}>
                {/* Med Header Row */}
                <View style={styles.medHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medName, { color: colors.text }]}>
                      {med.medicineName}
                    </Text>
                    <Text style={[styles.medDosage, { color: colors.textSecondary }]}>
                      {med.dosage} {med.strength ? `• ${med.strength}` : ''}
                    </Text>
                  </View>

                  <View style={styles.badgeGroup}>
                    <View
                      style={[
                        styles.frequencyBadge,
                        { backgroundColor: colors.primaryLight, borderColor: colors.border },
                      ]}>
                      <Text style={[styles.frequencyText, { color: colors.primary }]}>
                        {med.frequency}
                      </Text>
                    </View>

                    {med.foodInstruction && (
                      <View
                        style={[
                          styles.foodBadge,
                          { backgroundColor: isDark ? '#2A2515' : '#FEF3C7' },
                        ]}>
                        <Text
                          style={[
                            styles.foodBadgeText,
                            { color: isDark ? '#FBBF24' : '#B45309' },
                          ]}>
                          {med.foodInstruction.replace('_', ' ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Timing Schedule Grid (Morning, Afternoon, Evening, Night) */}
                <View
                  style={[
                    styles.timingsRow,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                      borderColor: colors.border,
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                    },
                  ]}>
                  {/* Morning */}
                  <View style={[styles.timingSlot, isMobile && { width: '48%', flex: undefined, marginVertical: 4 }]}>
                    <View
                      style={[
                        styles.timingIconBadge,
                        { backgroundColor: med.morning ? colors.successBg : colors.border },
                      ]}>
                      {med.morning ? (
                        <CheckIcon size={12} color={colors.success} />
                      ) : (
                        <CloseIcon size={12} color={colors.textMuted} />
                      )}
                    </View>
                    <Text style={[styles.timingSlotTitle, { color: colors.text }]}>Morning</Text>
                    <Text style={[styles.timingSlotTime, { color: colors.textMuted }]}>
                      {formatTimeTo12Hour(med.morningTime)}
                    </Text>
                  </View>

                  {/* Afternoon */}
                  <View style={[styles.timingSlot, isMobile && { width: '48%', flex: undefined, marginVertical: 4 }]}>
                    <View
                      style={[
                        styles.timingIconBadge,
                        { backgroundColor: med.afternoon ? colors.successBg : colors.border },
                      ]}>
                      {med.afternoon ? (
                        <CheckIcon size={12} color={colors.success} />
                      ) : (
                        <CloseIcon size={12} color={colors.textMuted} />
                      )}
                    </View>
                    <Text style={[styles.timingSlotTitle, { color: colors.text }]}>Afternoon</Text>
                    <Text style={[styles.timingSlotTime, { color: colors.textMuted }]}>
                      {formatTimeTo12Hour(med.afternoonTime)}
                    </Text>
                  </View>

                  {/* Evening */}
                  <View style={[styles.timingSlot, isMobile && { width: '48%', flex: undefined, marginVertical: 4 }]}>
                    <View
                      style={[
                        styles.timingIconBadge,
                        { backgroundColor: med.evening ? colors.successBg : colors.border },
                      ]}>
                      {med.evening ? (
                        <CheckIcon size={12} color={colors.success} />
                      ) : (
                        <CloseIcon size={12} color={colors.textMuted} />
                      )}
                    </View>
                    <Text style={[styles.timingSlotTitle, { color: colors.text }]}>Evening</Text>
                    <Text style={[styles.timingSlotTime, { color: colors.textMuted }]}>
                      {formatTimeTo12Hour(med.eveningTime)}
                    </Text>
                  </View>

                  {/* Night */}
                  <View style={[styles.timingSlot, isMobile && { width: '48%', flex: undefined, marginVertical: 4 }]}>
                    <View
                      style={[
                        styles.timingIconBadge,
                        { backgroundColor: med.night ? colors.successBg : colors.border },
                      ]}>
                      {med.night ? (
                        <CheckIcon size={12} color={colors.success} />
                      ) : (
                        <CloseIcon size={12} color={colors.textMuted} />
                      )}
                    </View>
                    <Text style={[styles.timingSlotTitle, { color: colors.text }]}>Night</Text>
                    <Text style={[styles.timingSlotTime, { color: colors.textMuted }]}>
                      {formatTimeTo12Hour(med.nightTime)}
                    </Text>
                  </View>
                </View>

                {/* Duration & Dates Footer */}
                <View style={styles.medFooterRow}>
                  <View style={styles.footerItem}>
                    <CalendarIcon size={14} color={colors.textMuted} />
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                      Start: <Text style={{ fontWeight: '600' }}>{formatDisplayDate(med.startDate)}</Text>
                    </Text>
                  </View>

                  {med.endDate && (
                    <View style={styles.footerItem}>
                      <CalendarIcon size={14} color={colors.textMuted} />
                      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        End: <Text style={{ fontWeight: '600' }}>{formatDisplayDate(med.endDate)}</Text>
                      </Text>
                    </View>
                  )}

                  {med.noOfDays && (
                    <View style={styles.footerItem}>
                      <ClockIcon size={14} color={colors.textMuted} />
                      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        Duration: <Text style={{ fontWeight: '600' }}>{med.noOfDays} days</Text>
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {/* ONE-CLICK SAVE TO DATABASE BUTTON */}
            <View style={styles.saveSection}>
              <Button
                title={saving ? 'Saving to Database...' : saveSuccess ? '✓ Saved to Database' : '💾 Save to Database (Call Spring Boot API)'}
                variant={saveSuccess ? 'secondary' : 'primary'}
                size="lg"
                loading={saving}
                disabled={saving || saveSuccess}
                onPress={handleSaveToDatabase}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two * 1.3,
    marginBottom: Spacing.three,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
    maxHeight: 280,
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.md,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  loadingContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingSub: {
    fontSize: 13,
  },
  resultsContainer: {
    width: '100%',
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  dataBox: {
    flex: 1,
    minWidth: 240,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
  },
  dataBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one * 1.5,
    marginBottom: Spacing.two,
    paddingBottom: Spacing.one,
  },
  dataBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoList: {
    gap: Spacing.one,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'right',
  },
  medicationCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  medHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
  },
  medDosage: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  frequencyBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 0.5,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  foodBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  foodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timingsRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    marginVertical: Spacing.two,
    justifyContent: 'space-around',
  },
  timingSlot: {
    alignItems: 'center',
    flex: 1,
  },
  timingIconBadge: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  timingSlotTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  timingSlotTime: {
    fontSize: 10.5,
    marginTop: 1,
  },
  medFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  saveSection: {
    marginTop: Spacing.three,
  },
});
