import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { MedicalFile, fileService } from '@/services/fileService';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import {
  FileTextIcon,
  DownloadIcon,
  TrashIcon,
  ExternalLinkIcon,
  CloseIcon,
  CheckIcon,
} from '@/components/common/Icons';
import { downloadFileAsync } from '@/utils/fileSystemHelper';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { WebPdfViewer } from './WebPdfViewer';
import { api } from '@/services/api';

interface FileCardProps {
  file: MedicalFile;
  onDelete: (id: number) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onDelete }) => {
  const { colors, isDark } = useAppTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const getCleanFileName = (): string => {
    const orig = file.originalFileName || '';
    const ext = orig.includes('.')
      ? orig.substring(orig.lastIndexOf('.'))
      : file.fileType?.includes('pdf')
      ? '.pdf'
      : file.fileType?.includes('png')
      ? '.png'
      : file.fileType?.includes('jpeg') || file.fileType?.includes('jpg')
      ? '.jpg'
      : '';

    let base = (file.fileName || file.originalFileName || `Medical_Report_${file.id}`).trim();
    if (ext && !base.toLowerCase().endsWith(ext.toLowerCase())) {
      base = `${base}${ext}`;
    }
    return base;
  };

  const isImageFile = (): boolean => {
    const orig = (file.originalFileName || '').toLowerCase();
    const mime = (file.fileType || '').toLowerCase();
    return (
      mime.startsWith('image/') ||
      orig.endsWith('.jpg') ||
      orig.endsWith('.jpeg') ||
      orig.endsWith('.png') ||
      orig.endsWith('.webp') ||
      orig.endsWith('.gif') ||
      orig.endsWith('.bmp')
    );
  };

  const isPdfFile = (): boolean => {
    const orig = (file.originalFileName || '').toLowerCase();
    const mime = (file.fileType || '').toLowerCase();
    return mime.includes('pdf') || orig.endsWith('.pdf');
  };

  const isDocFile = (): boolean => {
    const orig = (file.originalFileName || '').toLowerCase();
    const mime = (file.fileType || '').toLowerCase();
    return (
      orig.endsWith('.doc') ||
      orig.endsWith('.docx') ||
      orig.endsWith('.txt') ||
      orig.endsWith('.rtf') ||
      orig.endsWith('.odt') ||
      orig.endsWith('.csv') ||
      orig.endsWith('.xls') ||
      orig.endsWith('.xlsx') ||
      mime.includes('word') ||
      mime.includes('officedocument') ||
      mime.includes('text/plain')
    );
  };

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

  // Open In-App Preview (Never triggers unexpected download)
  const handleOpenPreview = () => {
    setPreviewVisible(true);
  };

  // Mobile / Web fallback to open in browser / external viewer
  const handleOpenExternalViewer = async (urlOverride?: any) => {
    const backendViewUrl = fileService.getViewUrl(file.id);
    const directUrl = file.url;
    const targetUrl = typeof urlOverride === 'string' ? urlOverride : (backendViewUrl || directUrl);

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(targetUrl, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(targetUrl);
      }
    } catch {
      Linking.openURL(targetUrl);
    }
  };

  // Download with exact filename and original extension (Fixes 401 error)
  const handleDownload = async () => {
    setDownloading(true);
    const cleanFileName = getCleanFileName();
    const backendDownloadUrl = fileService.getDownloadUrl(file.id);
    const directUrl = file.url;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Dual candidate URLs on web: try backend download URL first, fallback to direct
        let downloaded = false;
        const candidateUrls = [backendDownloadUrl, directUrl].filter(Boolean) as string[];

        for (const url of candidateUrls) {
          try {
            const reqHeaders: Record<string, string> = {};
            if (!url.includes('cloudinary.com')) {
              try {
                const token = api.getToken();
                if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
              } catch {}
            }

            const res = await fetch(url, { headers: reqHeaders });
            if (res.ok) {
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = cleanFileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
              downloaded = true;
              break;
            }
          } catch (e) {
            console.warn(`[FileCard] Web blob fetch failed for ${url}, trying fallback:`, e);
          }
        }

        if (!downloaded) {
          // Fallback via anchor navigation to backend endpoint (streams with attachment header)
          const fallbackLink = backendDownloadUrl || directUrl;
          const link = document.createElement('a');
          link.href = fallbackLink;
          link.download = cleanFileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Mobile Android / iOS: download to local cache and prompt native share/save
        const dlResult = await downloadFileAsync(backendDownloadUrl, cleanFileName, undefined, directUrl);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          let mimeType = file.fileType || 'application/octet-stream';
          const lower = cleanFileName.toLowerCase();
          if (lower.endsWith('.pdf')) {
            mimeType = 'application/pdf';
          } else if (lower.endsWith('.docx')) {
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else if (lower.endsWith('.doc')) {
            mimeType = 'application/msword';
          } else if (lower.endsWith('.txt')) {
            mimeType = 'text/plain';
          } else if (lower.endsWith('.png')) {
            mimeType = 'image/png';
          } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          }

          await Sharing.shareAsync(dlResult.uri, {
            mimeType,
            dialogTitle: `Save / Share ${cleanFileName}`,
            UTI: isPdfFile() ? 'com.adobe.pdf' : undefined,
          });
        }
      }
    } catch (err: any) {
      console.error('Download failed, falling back to direct link:', err);
      const fallbackLink = backendDownloadUrl || directUrl;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(fallbackLink, '_blank');
      } else {
        Linking.openURL(fallbackLink);
      }
    } finally {
      setDownloading(false);
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
              title={downloading ? 'Downloading...' : 'Download'}
              variant="outline"
              size="sm"
              loading={downloading}
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

      {/* IN-APP PREVIEW MODAL (Never triggers unwanted download) */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.previewModalContainer,
              {
                backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                borderColor: colors.border,
                maxHeight: windowHeight * 0.9,
                width: Math.min(windowWidth * 0.95, 800),
              },
            ]}>
            {/* Modal Header */}
            <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, paddingRight: Spacing.two }}>
                <Text numberOfLines={1} style={[styles.previewModalTitle, { color: colors.text }]}>
                  {file.fileName || file.originalFileName || 'Report Preview'}
                </Text>
                <Text numberOfLines={1} style={[styles.previewModalSub, { color: colors.textSecondary }]}>
                  {file.originalFileName} • {formatFileSize(file.size)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <Pressable
                  onPress={handleOpenExternalViewer}
                  style={({ pressed }) => [
                    styles.closeModalBtn,
                    { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9', opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <ExternalLinkIcon size={16} color={colors.text} />
                </Pressable>

                <Pressable
                  onPress={() => setPreviewVisible(false)}
                  style={({ pressed }) => [
                    styles.closeModalBtn,
                    { backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9', opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <CloseIcon size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>

            {/* Modal Body Preview Content */}
            <View style={styles.previewBody}>
              {isImageFile() ? (
                <View style={styles.imagePreviewWrapper}>
                  {imageLoading && (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Image...</Text>
                    </View>
                  )}
                  <Image
                    source={{ uri: file.url }}
                    style={styles.previewImage}
                    resizeMode="contain"
                    onLoadEnd={() => setImageLoading(false)}
                  />
                </View>
              ) : isPdfFile() ? (
                Platform.OS === 'web' ? (
                  <View style={styles.webPdfWrapper}>
                    <WebPdfViewer
                      primaryUrl={fileService.getViewUrl(file.id)}
                      fallbackUrl={file.url}
                      fileName={getCleanFileName()}
                      onOpenExternal={handleOpenExternalViewer}
                      onDownload={handleDownload}
                    />
                  </View>
                ) : (
                  <View style={styles.mobileDocCard}>
                    <FileTextIcon size={64} color={colors.primary} />
                    <Text style={[styles.mobileDocTitle, { color: colors.text }]}>
                      {getCleanFileName()}
                    </Text>
                    <Text style={[styles.mobileDocSub, { color: colors.textSecondary }]}>
                      {formatFileSize(file.size)} • PDF Medical Report
                    </Text>
                    <View style={styles.mobileDocButtons}>
                      <Button
                        title={downloading ? 'Downloading...' : 'Open & View PDF'}
                        variant="primary"
                        size="md"
                        loading={downloading}
                        icon={<FileTextIcon size={16} color="#FFFFFF" />}
                        onPress={handleDownload}
                      />
                      <View style={{ height: Spacing.two }} />
                      <Button
                        title="Open in Browser ↗"
                        variant="outline"
                        size="md"
                        icon={<ExternalLinkIcon size={16} color={colors.primary} />}
                        onPress={() => handleOpenExternalViewer()}
                      />
                    </View>
                  </View>
                )
              ) : (
                <View style={styles.mobileDocCard}>
                  <View style={[styles.docTypeBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.docTypeBadgeText, { color: colors.primary }]}>
                      {(file.originalFileName?.split('.').pop() || file.fileType?.split('/').pop() || 'DOC').toUpperCase()}
                    </Text>
                  </View>
                  <FileTextIcon size={56} color={colors.primary} />
                  <Text style={[styles.mobileDocTitle, { color: colors.text }]}>
                    {getCleanFileName()}
                  </Text>
                  <Text style={[styles.mobileDocSub, { color: colors.textSecondary }]}>
                    {formatFileSize(file.size)} • Medical Document Report
                  </Text>
                  <View style={styles.mobileDocButtons}>
                    <Button
                      title="Open in Online Viewer ↗"
                      variant="outline"
                      size="md"
                      icon={<ExternalLinkIcon size={16} color={colors.primary} />}
                      onPress={() => {
                        const directUrl = file.url || fileService.getViewUrl(file.id);
                        const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl)}&embedded=true`;
                        handleOpenExternalViewer(googleViewerUrl);
                      }}
                    />
                    <View style={{ height: Spacing.two }} />
                    <Button
                      title={downloading ? 'Downloading...' : 'Download & Open Document'}
                      variant="primary"
                      size="md"
                      loading={downloading}
                      icon={<DownloadIcon size={16} color="#FFFFFF" />}
                      onPress={handleDownload}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Modal Footer Actions */}
            <View style={[styles.previewFooter, { borderTopColor: colors.border }]}>
              <Button
                title={downloading ? 'Downloading...' : `Download ${getCleanFileName()}`}
                variant="primary"
                size="sm"
                loading={downloading}
                icon={<DownloadIcon size={16} color="#FFFFFF" />}
                onPress={handleDownload}
              />
              <Button
                title="Close"
                variant="ghost"
                size="sm"
                onPress={() => setPreviewVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  previewModalContainer: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: {
    padding: Spacing.three,
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 380,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginTop: Spacing.two,
  },
  webPdfWrapper: {
    width: '100%',
  },
  mobileDocCard: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDocTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  mobileDocSub: {
    fontSize: 12,
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
    textAlign: 'center',
  },
  mobileDocButtons: {
    marginTop: Spacing.two,
    width: '100%',
    maxWidth: 320,
  },
  docTypeBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.three,
  },
  docTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
});
