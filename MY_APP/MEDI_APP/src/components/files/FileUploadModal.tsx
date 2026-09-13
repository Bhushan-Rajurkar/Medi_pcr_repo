import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ActivityIndicator } from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { fileService, MedicalFile } from '@/services/fileService';
import { filePicker, PickedFile } from '@/utils/filePicker';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { UploadCloudIcon, CloseIcon, FileTextIcon, CheckIcon } from '@/components/common/Icons';

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
  const [selectedFile, setSelectedFile] = useState<PickedFile | null>(null);
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

  const handleFilePicked = (file: PickedFile) => {
    setSelectedFile(file);
    // Suggest a default title only if the user hasn't already entered a custom name
    if (!fileName.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-+]/g, ' ');
      setFileName(cleanName);
    }
  };

  // Cross-platform document picker handler (Android, iOS, Web)
  const handlePickDocument = async () => {
    try {
      const picked = await filePicker.pickDocument();
      if (picked) {
        handleFilePicked(picked);
      }
    } catch (err: any) {
      setToast({
        id: 'pick_err',
        type: 'error',
        message: err.message || 'Could not open file picker on this device.',
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setToast({ id: '1', type: 'error', message: 'Please select a file to upload.' });
      return;
    }

    const reportTitle = fileName.trim() || selectedFile.name;

    setUploading(true);
    setToast(null);

    try {
      const res = await fileService.uploadFile(selectedFile, reportTitle);
      setToast({
        id: 'upload_ok',
        type: 'success',
        message: `Medical report "${reportTitle}" uploaded successfully!`,
      });
      setTimeout(() => {
        onSuccess(res);
        handleClose();
      }, 1000);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setToast({
        id: 'upload_err',
        type: 'error',
        message: err.message || 'Failed to upload report. Please check your connection and try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Upload Medical Report" maxWidth={560}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Upload your lab reports, prescriptions, radiology scans, or test results. Give your report a custom name for easy identification.
      </Text>

      {/* Step 1: Universal File Selector Button & Dropzone (Android, iOS & Web) */}
      <Pressable
        onPress={handlePickDocument}
        style={({ pressed }) => [
          styles.dropZone,
          {
            backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
            borderColor: selectedFile ? colors.primary : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        {Platform.OS === 'web' && (
          <input
            type="file"
            id="medical-file-upload-input"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.csv,.xls,.xlsx"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFilePicked({
                  uri: URL.createObjectURL(file),
                  name: file.name,
                  size: file.size,
                  mimeType: file.type || 'application/octet-stream',
                  file,
                });
              }
            }}
          />
        )}
        <View style={styles.dropZoneContent}>
          <UploadCloudIcon size={42} color={colors.primary} />
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.primary,
              marginTop: 8,
              marginBottom: 4,
              textAlign: 'center',
            }}>
            {selectedFile ? '🔄 Choose a Different File' : '📁 Tap to Browse File / Document'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
            Supports PDF, PNG, JPG, DOCX, TXT, CSV (up to 100MB)
          </Text>
        </View>
      </Pressable>

      {/* Selected File Details Banner */}
      {selectedFile && (
        <View
          style={[
            styles.fileMetaPreview,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight,
              borderColor: colors.border,
            },
          ]}>
          <View style={{ marginRight: 12 }}>
            <FileTextIcon size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectedFileName, { color: colors.text }]} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text style={[styles.selectedFileSize, { color: colors.textSecondary }]}>
              Size: {formatFileSize(selectedFile.size)} • Type: {selectedFile.mimeType || 'Document'}
            </Text>
          </View>
          <Pressable
            onPress={() => setSelectedFile(null)}
            style={({ pressed }) => [
              styles.removeBtn,
              { opacity: pressed ? 0.7 : 1, backgroundColor: isDark ? colors.surfaceHighlight : '#FFFFFF' },
            ]}>
            <CloseIcon size={14} color={colors.danger} />
          </Pressable>
        </View>
      )}

      {/* Step 2: Custom Report Name Input (Used for searching and traversing) */}
      <View style={{ marginTop: Spacing.two }}>
        <Input
          label="Report Name / Title *"
          placeholder="e.g. Complete Blood Count / Chest X-Ray 2026"
          value={fileName}
          onChangeText={setFileName}
          helperText="Enter your custom report title. You can traverse and search your reports using this name."
        />
        {fileName.trim() ? (
          <Pressable
            onPress={() => setFileName('')}
            style={{ alignSelf: 'flex-start', marginTop: -8, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
              ✕ Clear name and enter new one
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Step 3: Upload Action Button */}
      <Button
        title={uploading ? 'Uploading Report...' : 'Upload Medical Report'}
        onPress={handleUpload}
        loading={uploading}
        disabled={!selectedFile || uploading}
        style={{ marginTop: Spacing.two }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  description: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  dropZoneContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  fileMetaPreview: {
    padding: Spacing.two * 1.2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedFileSize: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginLeft: 8,
  },
});
