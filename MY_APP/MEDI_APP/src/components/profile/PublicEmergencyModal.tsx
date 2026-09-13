import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { EmergencyProfile } from '@/services/profileService';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  PhoneIcon,
  AlertTriangleIcon,
  HeartPulseIcon,
  DoctorIcon,
  ShieldCheckIcon,
  ShareIcon,
} from '@/components/common/Icons';

interface PublicEmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  profile: EmergencyProfile | null;
}

export const PublicEmergencyModal: React.FC<PublicEmergencyModalProps> = ({
  visible,
  onClose,
  profile,
}) => {
  const { colors, isDark } = useAppTheme();

  if (!profile) return null;

  const handleCall = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleShare = async () => {
    const emergencyUrl = profile.emergencyViewUrl || '';
    if (!emergencyUrl) return;

    const shareMessage = `Emergency medical information for ${profile.name}:\n${emergencyUrl}`;

    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({
            title: `Emergency Medical Card - ${profile.name}`,
            text: shareMessage,
            url: emergencyUrl,
          });
          return;
        }
      } else {
        const { Share: RNShare } = require('react-native');
        await RNShare.share({
          title: `Emergency Medical Card - ${profile.name}`,
          message: shareMessage,
          url: emergencyUrl,
        });
        return;
      }
    } catch {
      // ignore
    }

    try {
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(emergencyUrl);
      alert('Emergency card URL copied to clipboard!');
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(emergencyUrl);
        alert('Emergency card URL copied to clipboard!');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Public Emergency Medical ID"
      maxWidth={580}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Emergency Alert Banner */}
        <View style={styles.emergencyBanner}>
          <Text style={styles.bannerIcon}>🚨</Text>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>EMERGENCY MEDICAL CARD</Text>
            <Text style={styles.bannerSubtitle}>
              Verified Medical Data for First Responders & Paramedics
            </Text>
          </View>
        </View>

        {/* Patient Bio & Blood Group */}
        <View
          style={[
            styles.patientCard,
            {
              backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.patientRow}>
            {profile.profilePicture ? (
              <Image source={{ uri: profile.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 28 }}>👤</Text>
              </View>
            )}

            <View style={styles.patientDetails}>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {profile.name || 'Patient'}
              </Text>
              <Text style={[styles.patientPhone, { color: colors.textSecondary }]}>
                📞 {profile.contactNumber || 'No phone provided'}
              </Text>
              <Text
                style={[styles.patientAddress, { color: colors.textSecondary }]}
                numberOfLines={2}>
                📍 {profile.address || 'No address provided'}
              </Text>
            </View>
          </View>

          {profile.bloodGroup && (
            <View style={styles.bloodBadgeContainer}>
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodBadgeText}>
                  🩸 BLOOD GROUP: {profile.bloodGroup}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Critical Calling Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🚨 Immediate Emergency Dialing
        </Text>

        <View style={styles.contactsGrid}>
          {/* Guardian Contact */}
          <View
            style={[
              styles.contactCard,
              {
                backgroundColor: isDark ? colors.surfaceHighlight : '#FFF1F2',
                borderColor: '#FDA4AF',
              },
            ]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactType, { color: '#E11D48' }]}>
                EMERGENCY GUARDIAN / KIN
              </Text>
              <Text style={[styles.contactPerson, { color: colors.text }]}>
                {profile.guardianName}
              </Text>
              <Text style={[styles.contactSub, { color: colors.textSecondary }]}>
                📍 {profile.guardianAddress}
              </Text>
            </View>
            <Button
              title="Call Guardian"
              variant="danger"
              size="sm"
              icon={<PhoneIcon size={14} color="#FFFFFF" />}
              onPress={() => handleCall(profile.guardianContact)}
            />
          </View>

          {/* Doctor Contact */}
          <View
            style={[
              styles.contactCard,
              {
                backgroundColor: isDark ? colors.surfaceHighlight : '#F0FDF4',
                borderColor: '#86EFAC',
              },
            ]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactType, { color: colors.primary }]}>
                PRIMARY PHYSICIAN / DOCTOR
              </Text>
              <Text style={[styles.contactPerson, { color: colors.text }]}>
                Dr. {profile.doctorName}
              </Text>
              <Text style={[styles.contactSub, { color: colors.textSecondary }]}>
                📞 {profile.doctorContact}
              </Text>
            </View>
            <Button
              title="Call Doctor"
              variant="primary"
              size="sm"
              icon={<PhoneIcon size={14} color="#FFFFFF" />}
              onPress={() => handleCall(profile.doctorContact)}
            />
          </View>
        </View>

        {/* Critical Allergies */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ⚠️ Known Allergies & Sensitivities
        </Text>
        <View
          style={[
            styles.allergySection,
            {
              backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
              borderColor: colors.border,
            },
          ]}>
          {profile.allergies && profile.allergies.length > 0 ? (
            <View style={styles.allergyWrap}>
              {profile.allergies.map((item, idx) => (
                <View key={idx} style={styles.allergyChip}>
                  <AlertTriangleIcon size={12} color="#DC2626" />
                  <Text style={styles.allergyText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No known allergies or medical warnings reported.
            </Text>
          )}
        </View>

        {/* Vitals Summary */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ❤️ Recorded Health Vitals
        </Text>
        <View style={styles.vitalsGrid}>
          <View
            style={[
              styles.vitalBox,
              {
                backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>
              Blood Pressure
            </Text>
            <Text style={[styles.vitalValue, { color: colors.text }]}>
              {profile.bloodPressure || 'N/A'}
            </Text>
          </View>

          <View
            style={[
              styles.vitalBox,
              {
                backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>
              Heart Rate
            </Text>
            <Text style={[styles.vitalValue, { color: colors.text }]}>
              {profile.heartRate ? `${profile.heartRate} bpm` : 'N/A'}
            </Text>
          </View>

          <View
            style={[
              styles.vitalBox,
              {
                backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>
              Age / Height
            </Text>
            <Text style={[styles.vitalValue, { color: colors.text }]}>
              {profile.age ? `${profile.age} yrs` : '-'} / {profile.height ? `${profile.height} cm` : '-'}
            </Text>
          </View>

          <View
            style={[
              styles.vitalBox,
              {
                backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>
              Weight
            </Text>
            <Text style={[styles.vitalValue, { color: colors.text }]}>
              {profile.weight ? `${profile.weight} kg` : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.modalFooter}>
          <Button
            title="Share Emergency Link"
            variant="outline"
            icon={<ShareIcon size={14} color={colors.primary} />}
            onPress={handleShare}
            style={{ flex: 1 }}
          />
          <Button
            title="Close"
            variant="secondary"
            onPress={onClose}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
  },
  emergencyBanner: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  bannerIcon: {
    fontSize: 24,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: '#FEE2E2',
    fontSize: 11,
    marginTop: 2,
  },
  patientCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
  },
  patientPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  patientAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  bloodBadgeContainer: {
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bloodBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  bloodBadgeText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  contactsGrid: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  contactType: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactPerson: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  contactSub: {
    fontSize: 12,
    marginTop: 2,
  },
  allergySection: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  allergyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  allergyText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  vitalBox: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.two,
  },
  vitalLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  vitalValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
