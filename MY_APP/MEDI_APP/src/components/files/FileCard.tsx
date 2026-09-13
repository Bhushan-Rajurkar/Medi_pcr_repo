import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { MedicalFile, fileService } from '@/services/fileService';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { FileTextIcon, DownloadIcon, TrashIcon, ExternalLinkIcon } from '@/components/common/Icons';

interface FileCardProps {
  file: MedicalFile;
  onDelete: (id: number) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onDelete }) => {
  const { colors, isDark } = useAppTheme();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenPreview = () => {
    if (file.url) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(file.url, '_blank');
      } else {
        Linking.openURL(file.url);
      }
    }
  };

  const handleDownload = () => {
    const downloadUrl = fileService.getDownloadUrl(file.id);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(downloadUrl, '_blank');
    } else {
      Linking.openURL(downloadUrl);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fileService.deleteFile(file.id);
      onDelete(file.id);
    } catch (err) {
      console.error('Delete file failed:', err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: isDark ? colors.surfaceHighlight : colors.surface },
          ]}>
          <FileTextIcon size={22} color={colors.primary} />
        </View>
        <View style={styles.titleCol}>
          <Text
            numberOfLines={1}
            style={[styles.displayName, { color: colors.text }]}>
            {file.fileName || file.originalFileName || `Record #${file.id}`}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.originalName, { color: colors.textSecondary }]}>
            {file.originalFileName}
          </Text>
        </View>
      </View>

      {/* Metadata Pill Row */}
      <View style={styles.metaRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.primaryLight, borderColor: colors.border },
          ]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {file.fileType ? file.fileType.toUpperCase() : 'FILE'}
          </Text>
        </View>

        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          {formatFileSize(file.size)}
        </Text>

        <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>

        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          {formatDate(file.uploadedAt)}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        {confirmDelete ? (
          <View style={styles.confirmRow}>
            <Text style={[styles.confirmText, { color: colors.danger }]}>Delete?</Text>
            <Button
              title="Yes"
              variant="danger"
              size="sm"
              loading={deleting}
              onPress={handleDelete}
            />
            <Button
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => setConfirmDelete(false)}
            />
          </View>
        ) : (
          <>
            <Button
              title="Preview"
              variant="ghost"
              size="sm"
              icon={<ExternalLinkIcon size={14} color={colors.text} />}
              onPress={handleOpenPreview}
            />
            <Button
              title="Download"
              variant="outline"
              size="sm"
              icon={<DownloadIcon size={14} color={colors.primary} />}
              onPress={handleDownload}
            />
            <Pressable
              onPress={() => setConfirmDelete(true)}
              style={({ pressed }) => [
                styles.deleteBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}>
              <TrashIcon size={18} color={colors.danger} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  originalName: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one * 1.5,
    marginTop: Spacing.two,
    marginBottom: Spacing.two * 1.2,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
  actionRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    justifyContent: 'flex-end',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 'auto',
  },
  deleteBtn: {
    padding: Spacing.one,
    marginLeft: Spacing.one,
    cursor: 'pointer' as any,
  },
});
