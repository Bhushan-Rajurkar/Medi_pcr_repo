import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, Pressable } from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';
import { filePicker, PickedFile } from '@/utils/filePicker';

interface ProfileSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();
  const { user, updateUserInState, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<PickedFile | File | null>(null);

  // Change Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPreviewUrl(user.profilePicture || '');
      setSelectedFile(null);
    }
  }, [user, visible]);

  const handlePickPhoto = async () => {
    const file = await filePicker.pickImage();
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(file.uri);
    }
  };

  // Handle Profile Update (Name and/or Profile Picture)
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      setToast({ id: '1', type: 'error', message: 'Name cannot be blank' });
      return;
    }
    setProfileLoading(true);
    setToast(null);
    try {
      let updated;
      if (selectedFile) {
        // Use Multipart endpoint
        const formData = new FormData();
        formData.append('name', name.trim());
        filePicker.appendFile(formData, 'profilePicture', selectedFile);
        updated = await authService.updateProfileMultipart(formData);
      } else {
        // Use JSON endpoint
        updated = await authService.updateProfile(name.trim());
      }
      updateUserInState(updated);
      setSelectedFile(null);
      if (updated?.profilePicture) {
        setPreviewUrl(updated.profilePicture);
      }
      setToast({
        id: 'prof_ok',
        type: 'success',
        message: 'Profile updated successfully!',
      });
      await refreshProfile();
    } catch (err: any) {
      setToast({
        id: 'prof_err',
        type: 'error',
        message: err.message || 'Failed to update profile',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      setToast({ id: '1', type: 'error', message: 'Both current and new password are required' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ id: '2', type: 'error', message: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ id: '3', type: 'error', message: 'Passwords do not match' });
      return;
    }
    setPasswordLoading(true);
    setToast(null);
    try {
      const msg = await authService.changePassword(currentPassword, newPassword);
      setToast({
        id: 'pwd_ok',
        type: 'success',
        message: msg || 'Password changed successfully!',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setToast({
        id: 'pwd_err',
        type: 'error',
        message: err.message || 'Failed to change password',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Account & Profile Settings" maxWidth={560}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Profile Overview Card */}
      <View
        style={[
          styles.overviewCard,
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
            borderColor: colors.border,
          },
        ]}>
        {previewUrl || user?.profilePicture ? (
          <Image source={{ uri: (previewUrl || user?.profilePicture) as string }} style={styles.avatarLarge} />
        ) : (
          <View style={[styles.avatarLargeFallback, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarLargeLetter, { color: isDark ? '#0E1612' : '#FFFFFF' }]}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}
        <View style={styles.userInfoCol}>
          <Text style={[styles.userNameText, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.userEmailText, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: user?.enabled ? colors.successBg : colors.warningBg },
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: user?.enabled ? colors.success : colors.warning },
                ]}>
                {user?.enabled ? 'Active Account' : 'Unverified'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Section 1: Edit Profile */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Personal Details</Text>
        <Input
          label="Full Name"
          placeholder="Your full name"
          value={name}
          onChangeText={setName}
        />

        {/* Direct Photo Upload */}
        <View style={styles.photoUploadBox}>
          <Text style={[styles.photoUploadLabel, { color: colors.text }]}>Profile Picture</Text>
          <View style={styles.photoUploadRow}>
            {previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.photoThumbnail} />
            ) : (
              <View
                style={[
                  styles.photoThumbnailPlaceholder,
                  { backgroundColor: isDark ? colors.surfaceHighlight : colors.surface, borderColor: colors.border },
                ]}>
                <Text style={{ fontSize: 20 }}>📷</Text>
              </View>
            )}

            <View style={styles.photoUploadActions}>
              <Pressable
                onPress={handlePickPhoto}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {selectedFile ? '🔄 Choose Another Photo' : '📁 Upload New Photo'}
                </Text>
              </Pressable>

              {selectedFile && (
                <Pressable
                  onPress={() => {
                    setSelectedFile(null);
                    setPreviewUrl(user?.profilePicture || '');
                  }}
                  style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '600' }}>
                    Cancel & revert photo
                  </Text>
                </Pressable>
              )}

              <Text style={[styles.photoHelpText, { color: colors.textSecondary }]}>
                {selectedFile
                  ? `Selected: ${selectedFile.name}`
                  : 'Upload PNG, JPG, or WEBP photo'}
              </Text>
            </View>
          </View>
        </View>

        <Button
          title="Save Profile Changes"
          onPress={handleUpdateProfile}
          loading={profileLoading}
          style={{ marginTop: Spacing.two }}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Section 2: Change Password */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>
        <Input
          label="Current Password"
          placeholder="••••••••"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Input
          label="New Password"
          placeholder="••••••••"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Input
          label="Confirm New Password"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Button
          title="Update Password"
          variant="outline"
          onPress={handleChangePassword}
          loading={passwordLoading}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
  },
  avatarLargeFallback: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeLetter: {
    fontSize: 26,
    fontWeight: '800',
  },
  userInfoCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 13,
    marginTop: Spacing.half,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.one,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  photoUploadBox: {
    marginBottom: Spacing.three,
  },
  photoUploadLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  photoUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  photoThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  photoThumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadActions: {
    flex: 1,
  },
  photoHelpText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.four,
  },
});
