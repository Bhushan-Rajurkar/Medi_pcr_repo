import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Pressable,
} from 'react-native';
import { MedicalFile, fileService } from '@/services/fileService';
import { FileCard } from './FileCard';
import { FileUploadModal } from './FileUploadModal';
import { Button } from '@/components/common/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  SearchIcon,
  CloseIcon,
  FileTextIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
} from '@/components/common/Icons';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

interface FileListProps {
  onOpenAuth: () => void;
}

export const FileList: React.FC<FileListProps> = ({ onOpenAuth }) => {
  const { colors, isDark } = useAppTheme();
  const { isAuthenticated } = useAuth();
  const { isSmallMobile, isMobile } = useResponsive();

  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async (keyword?: string) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      let data: MedicalFile[];
      if (keyword && keyword.trim()) {
        data = await fileService.searchFiles(keyword.trim());
      } else {
        data = await fileService.getMyFiles();
      }
      setFiles(data);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      setError(err.message || 'Could not load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [isAuthenticated]);

  const handleSearchSubmit = () => {
    fetchFiles(searchKeyword);
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    fetchFiles('');
  };

  const handleFileDeleted = (deletedId: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedId));
  };

  const handleFileUploaded = (newFile: MedicalFile) => {
    setFiles((prev) => [newFile, ...prev]);
  };

  if (!isAuthenticated) {
    return (
      <View
        style={[
          styles.unauthCard,
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
            borderColor: colors.border,
          },
        ]}>
        <ShieldCheckIcon size={40} color={colors.primary} />
        <Text style={[styles.unauthTitle, { color: colors.text }]}>
          Authentication Required
        </Text>
        <Text style={[styles.unauthText, { color: colors.textSecondary }]}>
          Please sign in to view, upload, and manage your medical records and lab reports.
        </Text>
        <Button
          title="Sign In / Register"
          onPress={onOpenAuth}
          style={{ marginTop: Spacing.two }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Controls: Search Bar & Upload Button */}
      <View
        style={[
          styles.controlsRow,
          isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
        ]}>
        <View
          style={[
            styles.searchWrapper,
            {
              backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
              borderColor: colors.border,
            },
            isMobile && { minWidth: '100%', width: '100%' },
          ]}>
          <SearchIcon size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search files by title, name, format..."
            placeholderTextColor={colors.textMuted}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchKeyword ? (
            <Pressable onPress={handleClearSearch} style={styles.clearSearchBtn}>
              <CloseIcon size={14} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.actionButtonsRow, isMobile && { width: '100%', justifyContent: 'space-between' }]}>
          <Button
            title="Search"
            variant="secondary"
            size="sm"
            style={isMobile ? { flex: 1 } : undefined}
            onPress={handleSearchSubmit}
          />
          <Button
            title="Upload Record"
            variant="primary"
            size="sm"
            style={isMobile ? { flex: 1.5 } : undefined}
            icon={<UploadCloudIcon size={16} color={isDark ? '#0E1612' : '#FFFFFF'} />}
            onPress={() => setUploadModalOpen(true)}
          />
        </View>
      </View>

      {/* Stats / Header Bar */}
      <View style={styles.headerInfoRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Medical Documents
        </Text>
        <View
          style={[
            styles.countBadge,
            { backgroundColor: colors.primaryLight },
          ]}>
          <Text style={[styles.countBadgeText, { color: colors.primary }]}>
            {files.length} {files.length === 1 ? 'Record' : 'Records'}
          </Text>
        </View>
      </View>

      {/* Error Display */}
      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerBg }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Button
            title="Retry"
            size="sm"
            variant="outline"
            onPress={() => fetchFiles(searchKeyword)}
          />
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Fetching medical records...
          </Text>
        </View>
      )}

      {/* Empty State */}
      {!loading && files.length === 0 && (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <FileTextIcon size={42} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {searchKeyword ? 'No Matching Records Found' : 'No Medical Records Yet'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchKeyword
              ? `We couldn't find any documents matching "${searchKeyword}". Try checking for typos or searching by extension.`
              : 'Upload your first prescription, lab report, or diagnostic scan to store it securely in MEDI-PCR.'}
          </Text>
          {searchKeyword ? (
            <Button
              title="Clear Search"
              variant="outline"
              size="sm"
              onPress={handleClearSearch}
              style={{ marginTop: Spacing.two }}
            />
          ) : (
            <Button
              title="Upload First Record"
              variant="primary"
              size="sm"
              icon={<UploadCloudIcon size={16} color={isDark ? '#0E1612' : '#FFFFFF'} />}
              onPress={() => setUploadModalOpen(true)}
              style={{ marginTop: Spacing.two }}
            />
          )}
        </View>
      )}

      {/* Files Grid / List */}
      {!loading && files.length > 0 && (
        <View style={styles.grid}>
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={handleFileDeleted}
            />
          ))}
        </View>
      )}

      {/* Upload Modal */}
      <FileUploadModal
        visible={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleFileUploaded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  searchWrapper: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: Spacing.one,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one * 1.5,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: Spacing.two * 1.3,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  loadingWrapper: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyCard: {
    padding: Spacing.five,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginVertical: Spacing.three,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  emptyText: {
    fontSize: 13.5,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 19,
  },
  grid: {
    width: '100%',
  },
  unauthCard: {
    padding: Spacing.six,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
  unauthTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  unauthText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 20,
  },
});
