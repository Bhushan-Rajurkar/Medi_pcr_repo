import React from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { isMobile, isSmallMobile } = useResponsive();

  const getResponsiveTypeStyle = () => {
    switch (type) {
      case 'title':
        return {
          fontSize: isSmallMobile ? 22 : isMobile ? 26 : 40,
          lineHeight: isSmallMobile ? 28 : isMobile ? 32 : 46,
        };
      case 'subtitle':
        return {
          fontSize: isSmallMobile ? 17 : isMobile ? 20 : 28,
          lineHeight: isSmallMobile ? 24 : isMobile ? 26 : 36,
        };
      default:
        return undefined;
    }
  };

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        getResponsiveTypeStyle(),
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
