import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { CloseIcon } from './Icons';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  maxWidth = 540,
}) => {
  const { colors, isDark } = useAppTheme();
  const { isSmallMobile, isMobile, width } = useResponsive();

  const overlayPadding = isSmallMobile ? 6 : isMobile ? 10 : Spacing.three;
  const contentPadding = isSmallMobile ? 10 : isMobile ? 14 : Spacing.four;
  const effectiveMaxWidth = Math.min(maxWidth, width - overlayPadding * 2);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={[styles.overlay, { padding: overlayPadding }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.contentContainer,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
              borderColor: colors.border,
              maxWidth: effectiveMaxWidth,
              maxHeight: isMobile ? '96%' : '90%',
              borderRadius: isSmallMobile ? BorderRadius.md : BorderRadius.lg,
            },
          ]}>
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                paddingHorizontal: contentPadding,
                paddingVertical: isSmallMobile ? 10 : Spacing.three,
              },
            ]}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontSize: isSmallMobile ? 15 : isMobile ? 16.5 : 18,
                  flex: 1,
                  marginRight: 8,
                },
              ]}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: pressed ? colors.surfaceHighlight : 'transparent',
                  width: isSmallMobile ? 28 : 32,
                  height: isSmallMobile ? 28 : 32,
                },
              ]}>
              <CloseIcon size={isSmallMobile ? 14 : 16} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.bodyContent, { padding: contentPadding }]}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '700',
  },
  closeBtn: {
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    maxHeight: '100%',
  },
  bodyContent: {
    width: '100%',
  },
});
