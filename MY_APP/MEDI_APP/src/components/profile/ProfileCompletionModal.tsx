import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { profileService, EmergencyProfile, ProfileFormData } from '@/services/profileService';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  HeartPulseIcon,
  DoctorIcon,
  ShieldCheckIcon,
  CloseIcon,
  AlertTriangleIcon,
} from '@/components/common/Icons';

interface ProfileCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  initialProfile?: EmergencyProfile | null;
  onSaved: (saved: EmergencyProfile) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  visible,
  onClose,
  initialProfile,
  onSaved,
}) => {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();

  // Basic Account
  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  // Mandatory Contact & Personal
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');

  // Mandatory Guardian Details
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');

  // Mandatory Doctor Details
  const [doctorName, setDoctorName] = useState('');
  const [doctorContact, setDoctorContact] = useState('');

  // Optional Health Details
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState('');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialProfile) {
        setName(initialProfile.name || user?.name || '');
        setProfilePicture(initialProfile.profilePicture || user?.profilePicture || '');
        setContactNumber(initialProfile.contactNumber || '');
        setAddress(initialProfile.address || '');
        setGuardianName(initialProfile.guardianName || '');
        setGuardianContact(initialProfile.guardianContact || '');
        setGuardianAddress(initialProfile.guardianAddress || '');
        setDoctorName(initialProfile.doctorName || '');
        setDoctorContact(initialProfile.doctorContact || '');
        setBloodPressure(initialProfile.bloodPressure || '');
        setHeartRate(initialProfile.heartRate || '');
        setWeight(initialProfile.weight ? String(initialProfile.weight) : '');
        setAge(initialProfile.age ? String(initialProfile.age) : '');
        setHeight(initialProfile.height ? String(initialProfile.height) : '');
        setBloodGroup(initialProfile.bloodGroup || '');
        setAllergies(initialProfile.allergies || []);
      } else {
        setName(user?.name || '');
        setProfilePicture(user?.profilePicture || '');
        setContactNumber('');
        setAddress('');
        setGuardianName('');
        setGuardianContact('');
        setGuardianAddress('');
        setDoctorName('');
        setDoctorContact('');
        setBloodPressure('');
        setHeartRate('');
        setWeight('');
        setAge('');
        setHeight('');
        setBloodGroup('');
        setAllergies([]);
      }
      setNewAllergy('');
      setToast(null);
    }
  }, [visible, initialProfile, user]);

  const handleAddAllergy = () => {
    const trimmed = newAllergy.trim();
    if (!trimmed) return;
    if (allergies.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      setToast({ id: 'all_dup', type: 'error', message: 'Allergy already added' });
      return;
    }
    setAllergies([...allergies, trimmed]);
    setNewAllergy('');
  };

  const handleRemoveAllergy = (indexToRemove: number) => {
    setAllergies(allergies.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    // Validate all mandatory fields
    if (!contactNumber.trim()) {
      setToast({ id: 'val_1', type: 'error', message: 'Personal Contact Number is mandatory' });
      return;
    }
    if (!address.trim()) {
      setToast({ id: 'val_2', type: 'error', message: 'Personal Address is mandatory' });
      return;
    }
    if (!guardianName.trim()) {
      setToast({ id: 'val_3', type: 'error', message: 'Guardian / Emergency Contact Name is mandatory' });
      return;
    }
    if (!guardianContact.trim()) {
      setToast({ id: 'val_4', type: 'error', message: 'Guardian Contact Number is mandatory' });
      return;
    }
    if (!guardianAddress.trim()) {
      setToast({ id: 'val_5', type: 'error', message: 'Guardian Address is mandatory' });
      return;
    }
    if (!doctorName.trim()) {
      setToast({ id: 'val_6', type: 'error', message: 'Doctor / Physician Name is mandatory' });
      return;
    }
    if (!doctorContact.trim()) {
      setToast({ id: 'val_7', type: 'error', message: 'Doctor Contact Number is mandatory' });
      return;
    }

    setLoading(true);
    setToast(null);

    const payload: ProfileFormData = {
      name: name.trim() || undefined,
      profilePicture: profilePicture.trim() || undefined,
      contactNumber: contactNumber.trim(),
      address: address.trim(),
      guardianName: guardianName.trim(),
      guardianContact: guardianContact.trim(),
      guardianAddress: guardianAddress.trim(),
      doctorName: doctorName.trim(),
      doctorContact: doctorContact.trim(),
      bloodPressure: bloodPressure.trim() || undefined,
      heartRate: heartRate.trim() || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      age: age ? parseInt(age, 10) : undefined,
      height: height ? parseFloat(height) : undefined,
      bloodGroup: bloodGroup.trim() || undefined,
      allergies,
    };

    try {
      const saved = await profileService.saveProfile(payload);
      setToast({
        id: 'save_ok',
        type: 'success',
        message: 'Profile completed! Unique Emergency QR Code generated.',
      });
      onSaved(saved);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setToast({
        id: 'save_err',
        type: 'error',
        message: err.message || 'Failed to save profile',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Complete Emergency Profile & QR"
      maxWidth={620}>
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Toast toast={toast} onDismiss={() => setToast(null)} />

        {/* Notice Banner */}
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: isDark ? colors.surfaceHighlight : colors.primaryLight,
              borderColor: colors.border,
            },
          ]}>
          <ShieldCheckIcon size={20} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.text }]}>
            All fields marked with <Text style={{ color: colors.danger, fontWeight: '700' }}>*</Text> are{' '}
            <Text style={{ fontWeight: '700' }}>mandatory</Text>. Health metrics (BP, weight, allergies) are optional.
            Once saved, your unique Emergency QR Code will activate immediately.
          </Text>
        </View>

        {/* SECTION 1: Personal & Contact Details */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            1. Personal & Contact Information
          </Text>
        </View>

        <Input
          label="Full Name (Account Default)"
          value={name}
          onChangeText={setName}
          placeholder="e.g. John Doe"
        />

        <Input
          label="Email Address (Linked Account)"
          value={user?.email || ''}
          editable={false}
          style={{ opacity: 0.7 }}
        />

        <Input
          label="Personal Contact Number *"
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="e.g. +1 555-0199 or +91 9876543210"
          keyboardType="phone-pad"
        />

        <Input
          label="Residential Address *"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. 124 Baker Street, Suite 4B, London"
          multiline
          numberOfLines={2}
        />

        {/* SECTION 2: Guardian Details */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            2. Emergency Guardian / Next of Kin Details
          </Text>
        </View>

        <Input
          label="Guardian / Emergency Contact Name *"
          value={guardianName}
          onChangeText={setGuardianName}
          placeholder="e.g. Sarah Jenkins (Mother / Spouse)"
        />

        <Input
          label="Guardian Contact Number *"
          value={guardianContact}
          onChangeText={setGuardianContact}
          placeholder="e.g. +1 555-0144"
          keyboardType="phone-pad"
        />

        <Input
          label="Guardian Residential Address *"
          value={guardianAddress}
          onChangeText={setGuardianAddress}
          placeholder="e.g. 78 Elm Avenue, New York, NY"
          multiline
          numberOfLines={2}
        />

        {/* SECTION 3: Primary Doctor Details */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. Primary Physician / Doctor Details
          </Text>
        </View>

        <Input
          label="Primary Doctor Name *"
          value={doctorName}
          onChangeText={setDoctorName}
          placeholder="e.g. Dr. Robert Chen, MD"
        />

        <Input
          label="Doctor Phone / Clinic Contact *"
          value={doctorContact}
          onChangeText={setDoctorContact}
          placeholder="e.g. +1 555-0188"
          keyboardType="phone-pad"
        />

        {/* SECTION 4: Optional Health Details */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HeartPulseIcon size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              4. Vital Health Details (Optional)
            </Text>
          </View>
          <Text style={[styles.optionalSubtitle, { color: colors.textSecondary }]}>
            Vital for paramedics, ER doctors, and emergency responders during a crisis.
          </Text>
        </View>

        {/* Blood Group Selection */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Blood Group</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map((bg) => {
              const selected = bloodGroup === bg;
              return (
                <Pressable
                  key={bg}
                  onPress={() => setBloodGroup(selected ? '' : bg)}
                  style={[
                    styles.bgChip,
                    {
                      backgroundColor: selected
                        ? colors.danger
                        : isDark
                        ? colors.surfaceHighlight
                        : colors.surface,
                      borderColor: selected ? colors.danger : colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.bgChipText,
                      { color: selected ? '#FFFFFF' : colors.text },
                    ]}>
                    {bg}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Vitals Grid */}
        <View style={styles.vitalsRow}>
          <Input
            label="Age (yrs)"
            value={age}
            onChangeText={setAge}
            placeholder="e.g. 29"
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Height (cm)"
            value={height}
            onChangeText={setHeight}
            placeholder="e.g. 175"
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>

        <View style={styles.vitalsRow}>
          <Input
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 68.5"
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Heart Rate (bpm)"
            value={heartRate}
            onChangeText={setHeartRate}
            placeholder="e.g. 72"
            containerStyle={styles.halfInput}
          />
        </View>

        <Input
          label="Blood Pressure"
          value={bloodPressure}
          onChangeText={setBloodPressure}
          placeholder="e.g. 120/80 mmHg"
        />

        {/* Allergies Tag Input */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            List of Known Allergies & Drug Reactions
          </Text>
          <View style={styles.allergyInputRow}>
            <TextInput
              style={[
                styles.allergyTextInput,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. Penicillin, Peanuts, Latex..."
              placeholderTextColor={colors.textMuted}
              value={newAllergy}
              onChangeText={setNewAllergy}
              onSubmitEditing={handleAddAllergy}
            />
            <Button
              title="Add"
              variant="secondary"
              size="sm"
              onPress={handleAddAllergy}
            />
          </View>

          {/* Chips list */}
          <View style={styles.allergyChipsContainer}>
            {allergies.map((allergy, index) => (
              <View
                key={`${allergy}-${index}`}
                style={[
                  styles.allergyBadge,
                  {
                    backgroundColor: isDark ? '#3E1B1B' : '#FEE2E2',
                    borderColor: '#FCA5A5',
                  },
                ]}>
                <AlertTriangleIcon size={12} color="#DC2626" />
                <Text style={styles.allergyBadgeText}>{allergy}</Text>
                <Pressable
                  onPress={() => handleRemoveAllergy(index)}
                  style={styles.allergyRemoveBtn}>
                  <CloseIcon size={12} color="#DC2626" />
                </Pressable>
              </View>
            ))}
            {allergies.length === 0 && (
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                No allergies added. Type above and tap "Add" if applicable.
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            title={loading ? 'Saving & Generating QR...' : 'Save & Generate QR Code'}
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
  formContainer: {
    paddingVertical: Spacing.two,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: Spacing.one,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldBlock: {
    marginBottom: Spacing.three,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  bgChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 46,
    alignItems: 'center',
  },
  bgChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  halfInput: {
    flex: 1,
  },
  allergyInputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  allergyTextInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  allergyChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  allergyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  allergyRemoveBtn: {
    padding: 2,
    marginLeft: 2,
  },
  emptyHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.six,
    marginBottom: Spacing.four,
  },
});
