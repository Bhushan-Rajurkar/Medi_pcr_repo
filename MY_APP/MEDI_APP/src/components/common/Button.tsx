import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors, isDark } = useAppTheme();

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled || loading) {
      return isDark ? colors.surfaceHighlight : colors.border;
    }
    switch (variant) {
      case 'primary':
        return pressed ? colors.primaryHover : colors.primary;
      case 'secondary':
        return pressed ? colors.surfaceHighlight : colors.surface;
      case 'outline':
      case 'ghost':
        return pressed ? colors.primaryLight : 'transparent';
      case 'danger':
        return pressed ? '#B91C1C' : colors.danger;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled || loading) {
      return colors.textMuted;
    }
    switch (variant) {
      case 'primary':
        return isDark ? '#0E1612' : '#FFFFFF';
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.text;
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return disabled ? colors.border : colors.primary;
    }
    if (variant === 'secondary') {
      return colors.border;
    }
    return 'transparent';
  };

  const getSizeStyles = (): { paddingVertical: number; paddingHorizontal: number; fontSize: number } => {
    switch (size) {
      case 'sm':
        return { paddingVertical: Spacing.one * 1.5, paddingHorizontal: Spacing.two * 1.5, fontSize: 13 };
      case 'lg':
        return { paddingVertical: Spacing.three, paddingHorizontal: Spacing.five, fontSize: 16 };
      default:
        return { paddingVertical: Spacing.two * 1.3, paddingHorizontal: Spacing.three * 1.5, fontSize: 14.5 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: sizeStyles.fontSize,
                marginLeft: icon ? Spacing.one * 1.5 : 0,
              },
              textStyle,
            ]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    cursor: 'pointer' as any,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
