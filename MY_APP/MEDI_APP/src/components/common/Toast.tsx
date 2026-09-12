import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';
import { CloseIcon } from './Icons';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return colors.successBg;
      case 'error':
        return colors.dangerBg;
      case 'warning':
        return colors.warningBg;
      default:
        return isDark ? colors.surfaceElevated : colors.surface;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'warning':
        return colors.warning;
      default:
        return colors.border;
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return isDark ? '#34D399' : '#15803D';
      case 'error':
        return isDark ? '#F87171' : '#B91C1C';
      case 'warning':
        return isDark ? '#FBBF24' : '#B45309';
      default:
        return colors.text;
    }
  };

  const getDisplayMessage = (): string => {
    if (typeof toast.message === 'string') {
      return toast.message;
    }
    if (toast.message && typeof toast.message === 'object') {
      if (typeof (toast.message as any).message === 'string') {
        return (toast.message as any).message;
      }
      if (typeof (toast.message as any).error === 'string') {
        return (toast.message as any).error;
      }
      try {
        return JSON.stringify(toast.message);
      } catch {
        return 'Notification';
      }
    }
    return String(toast.message || '');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}>
      <Text style={[styles.text, { color: getTextColor() }]}>
        {getDisplayMessage()}
      </Text>
      <Pressable onPress={onDismiss} style={styles.closeButton}>
        <CloseIcon size={14} color={getTextColor()} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two * 1.4,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  text: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: Spacing.two,
    padding: Spacing.half,
  },
});
