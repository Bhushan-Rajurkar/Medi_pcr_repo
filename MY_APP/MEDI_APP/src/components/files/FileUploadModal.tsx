import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { fileService, MedicalFile } from '@/services/fileService';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';

interface FileUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (uploaded: MedicalFile) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useAppTheme();
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const reset = () => {
    setFileName('');
    setSelectedFile(null);
    setToast(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setToast({ id: '1', type: 'error', message: 'Please select a file to upload' });
      return;
    }
    setUploading(true);
    setToast(null);
    try {
      const res = await fileService.uploadFile(selectedFile, fileName.trim() || undefined);
      setToast({
        id: 'upload_ok',
        type: 'success',
        message: 'Medical report uploaded successfully to Cloudinary!',
      });
      setTimeout(() => {
        onSuccess(res);
        handleClose();
      }, 1000);
    } catch (err: any) {
      setToast({
        id: 'upload_err',
        type: 'error',
        message: err.message || 'Failed to upload file',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Upload Medical Report / Record">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Upload your lab reports, prescriptions, scan results, or medical summaries securely.
      </Text>

      {/* File Selector */}
      {Platform.OS === 'web' && (
        <View
          style={[
            styles.dropZone,
            {
              backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
              borderColor: selectedFile ? colors.primary : colors.border,
            },
          ]}>
          <input
            type="file"
            id="medical-file-upload"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                if (!fileName) {
                  // Pre-fill user friendly name without extension
                  const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                  setFileName(nameWithoutExt);
                }
              }
            }}
          />
          <label
            htmlFor="medical-file-upload"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              padding: '24px 16px',
            }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📄</Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.primary,
                marginBottom: 4,
              }}>
              {selectedFile ? 'Change Selected File' : 'Click to Browse File'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              Supports PDF, PNG, JPG, DOCX (up to 100MB)
            </Text>
          </label>
        </View>
      )}

      {selectedFile && (
        <View
          style={[
            styles.fileMetaPreview,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.border,
            },
          ]}>
          <Text style={[styles.selectedFileName, { color: colors.text }]}>
            📁 {selectedFile.name}
          </Text>
          <Text style={[styles.selectedFileSize, { color: colors.textSecondary }]}>
            {formatFileSize(selectedFile.size)}
          </Text>
        </View>
      )}

      {/* Optional Custom File Name */}
      <Input
        label="Custom File Title (Optional)"
        placeholder="e.g. Chest X-Ray 2026 / Complete Blood Count"
        value={fileName}
        onChangeText={setFileName}
        helperText="A clear title helps you easily find this report later"
      />

      <Button
        title={uploading ? 'Uploading to Cloudinary...' : 'Upload Report'}
        onPress={handleUpload}
        loading={uploading}
        style={{ marginTop: Spacing.two }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  description: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: Spacing.three,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMetaPreview: {
    padding: Spacing.two * 1.3,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.two,
  },
  selectedFileSize: {
    fontSize: 12,
    fontWeight: '500',
  },
});
