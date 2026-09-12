import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { EmergencyProfile, profileService } from '@/services/profileService';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  QrCodeIcon,
  ShareIcon,
  CopyIcon,
  DownloadIcon,
  RefreshIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from '@/components/common/Icons';

interface EmergencyQrCardProps {
  profile: EmergencyProfile | null;
  onEditProfile: () => void;
  onPreviewEmergency: () => void;
  onProfileUpdated: (updated: EmergencyProfile) => void;
}

export const EmergencyQrCard: React.FC<EmergencyQrCardProps> = ({
  profile,
  onEditProfile,
  onPreviewEmergency,
  onProfileUpdated,
}) => {
  const { colors, isDark } = useAppTheme();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const isComplete = Boolean(
    (profile?.isComplete || profile?.complete || !!profile?.qrCodeDataUrl) &&
    profile?.qrCodeDataUrl
  );
  const emergencyUrl = profile?.emergencyViewUrl || '';

  // Handle Share QR / Link
  const handleShare = async () => {
    if (!emergencyUrl) {
      setToast({ id: 'no_url', type: 'error', message: 'Complete your profile first to share' });
      return;
    }

    const shareData = {
      title: `Emergency Medical ID - ${profile?.name || 'Medi-PCR'}`,
      text: `Scan or open this link in an emergency for vital medical info, allergies, and contacts for ${profile?.name || 'Patient'}:`,
      url: emergencyUrl,
    };

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share(shareData);
        setToast({ id: 'shared', type: 'success', message: 'Emergency QR link shared!' });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboard(emergencyUrl);
        }
      }
    } else {
      copyToClipboard(emergencyUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setToast({ id: 'copied', type: 'success', message: 'Emergency link copied to clipboard!' });
    } else {
      setToast({ id: 'copied', type: 'info', message: `Emergency Link: ${text}` });
    }
  };

  // Handle Download QR Image
  const handleDownload = () => {
    if (!profile?.qrCodeDataUrl) return;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = profile.qrCodeDataUrl;
      link.download = `emergency_qr_${profile.name ? profile.name.replace(/\s+/g, '_') : 'patient'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ id: 'dl_ok', type: 'success', message: 'QR Code image downloaded!' });
    } else if (profile.qrCodeToken) {
      const imgUrl = profileService.getQrImageUrl(profile.qrCodeToken);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(imgUrl, '_blank');
      }
    }
  };

  // Handle Regenerate QR
  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const updated = await profileService.regenerateQr();
      onProfileUpdated(updated);
      setToast({ id: 'regen_ok', type: 'success', message: 'Unique QR token regenerated successfully!' });
    } catch (err: any) {
      setToast({ id: 'regen_err', type: 'error', message: err.message || 'Failed to regenerate QR' });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isComplete ? colors.primaryLight : '#FEF3C7' },
            ]}>
            <QrCodeIcon
              size={22}
              color={isComplete ? colors.primary : '#D97706'}
            />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Emergency Medical QR Pass
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isComplete
                ? 'Scan or share to access immediate life-saving info'
                : 'Mandatory profile incomplete - Complete to activate'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isComplete ? '#DCFCE7' : '#FEF3C7',
              borderColor: isComplete ? '#86EFAC' : '#FDE68A',
            },
          ]}>
          {isComplete ? (
            <ShieldCheckIcon size={14} color="#16A34A" />
          ) : (
            <AlertTriangleIcon size={14} color="#D97706" />
          )}
          <Text
            style={[
              styles.statusText,
              { color: isComplete ? '#16A34A' : '#D97706' },
            ]}>
            {isComplete ? 'QR Code Active' : 'Setup Required'}
          </Text>
        </View>
      </View>

      {/* Content Area */}
      {isComplete && profile?.qrCodeDataUrl ? (
        <View style={styles.contentBody}>
          {/* QR Visual Card */}
          <View style={styles.qrVisualSection}>
            <View
              style={[
                styles.qrFrame,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                },
              ]}>
              <Image
                source={{ uri: profile.qrCodeDataUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <View style={styles.qrScanInstruction}>
                <Text style={styles.scanLabel}>MEDI-PCR EMERGENCY ID</Text>
                <Text style={styles.scanPatientName}>
                  {profile.name || 'Patient'}
                </Text>
              </View>
            </View>

            {/* Quick Actions underneath QR */}
            <View style={styles.qrActionsRow}>
              <Button
                title="Share QR"
                variant="primary"
                size="sm"
                icon={<ShareIcon size={14} color="#FFFFFF" />}
                onPress={handleShare}
                style={{ flex: 1 }}
              />
              <Button
                title="Copy Link"
                variant="secondary"
                size="sm"
                icon={<CopyIcon size={14} color={colors.text} />}
                onPress={() => copyToClipboard(emergencyUrl)}
                style={{ flex: 1 }}
              />
              <Button
                title="Download"
                variant="outline"
                size="sm"
                icon={<DownloadIcon size={14} color={colors.primary} />}
                onPress={handleDownload}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Profile Overview Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailsGrid}>
              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  EMERGENCY GUARDIAN
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {profile.guardianName}
                </Text>
                <Text style={[styles.detailSub, { color: colors.primary }]}>
                  📞 {profile.guardianContact}
                </Text>
              </View>

              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  PRIMARY DOCTOR
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  Dr. {profile.doctorName}
                </Text>
                <Text style={[styles.detailSub, { color: colors.primary }]}>
                  📞 {profile.doctorContact}
                </Text>
              </View>

              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  BLOOD GROUP
                </Text>
                <Text style={[styles.detailValue, { color: colors.danger, fontWeight: '800' }]}>
                  {profile.bloodGroup ? `🩸 ${profile.bloodGroup}` : 'Not Specified'}
                </Text>
                <Text style={[styles.detailSub, { color: colors.textSecondary }]}>
                  Allergies: {profile.allergies?.length ? profile.allergies.length : '0 reported'}
                </Text>
              </View>

              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  PATIENT CONTACT
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {profile.contactNumber}
                </Text>
                <Text
                  style={[styles.detailSub, { color: colors.textSecondary }]}
                  numberOfLines={1}>
                  📍 {profile.address}
                </Text>
              </View>
            </View>

            {/* Bottom Buttons */}
            <View style={styles.bottomControlRow}>
              <Button
                title="Preview Emergency Card"
                variant="primary"
                icon={<ExternalLinkIcon size={16} color="#FFFFFF" />}
                onPress={onPreviewEmergency}
                style={{ flex: 1 }}
              />
              <Button
                title="Edit Details"
                variant="outline"
                onPress={onEditProfile}
                style={{ flex: 1 }}
              />
              <Button
                title=""
                variant="ghost"
                loading={regenerating}
                icon={<RefreshIcon size={16} color={colors.textSecondary} />}
                onPress={handleRegenerate}
              />
            </View>
          </View>
        </View>
      ) : (
        /* Incomplete Profile Call to Action */
        <View style={styles.incompleteBox}>
          <Text style={[styles.incompleteTitle, { color: colors.text }]}>
            Your Emergency Medical QR Code is not generated yet.
          </Text>
          <Text style={[styles.incompleteDesc, { color: colors.textSecondary }]}>
            Fill in the mandatory contact details, emergency guardian, and primary doctor to activate your
            unique QR code. In an emergency, anyone can scan your QR code with a phone camera to quickly call
            your guardian or doctor and view vital health information.
          </Text>
          <Button
            title="Complete Emergency Profile Now"
            variant="primary"
            onPress={onEditProfile}
            style={{ alignSelf: 'flex-start', marginTop: Spacing.three }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    minWidth: 240,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  qrVisualSection: {
    alignItems: 'center',
    flex: 1,
    minWidth: 260,
  },
  qrFrame: {
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
    maxWidth: 280,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
  },
  qrScanInstruction: {
    alignItems: 'center',
    marginTop: 10,
  },
  scanLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#059669',
  },
  scanPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  qrActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
    width: '100%',
    maxWidth: 280,
  },
  detailsSection: {
    flex: 1.4,
    minWidth: 280,
    justifyContent: 'space-between',
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  detailBox: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  detailSub: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  bottomControlRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  incompleteBox: {
    paddingVertical: Spacing.two,
  },
  incompleteTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  incompleteDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: Spacing.one,
  },
});
