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
import { useResponsive } from '@/hooks/useResponsive';
import { BorderRadius, Spacing } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
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
  fullWidth = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors, isDark } = useAppTheme();
  const { isSmallMobile, isMobile, buttonPaddingV, buttonPaddingH, buttonFontSize } = useResponsive();

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

  const responsivePadV = buttonPaddingV(size);
  const responsivePadH = buttonPaddingH(size);
  const responsiveFont = buttonFontSize(size);

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
          paddingVertical: responsivePadV,
          paddingHorizontal: responsivePadH,
          opacity: disabled ? 0.6 : 1,
          width: fullWidth ? '100%' : undefined,
          minHeight: isSmallMobile ? 36 : isMobile ? 40 : 38,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: responsiveFont,
                marginLeft: icon ? (isSmallMobile ? 4 : Spacing.one * 1.5) : 0,
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
    flexShrink: 1,
  },
});
