import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isSmallMobile: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  scaleFont: (baseSize: number, minSize?: number) => number;
  getSpacing: (mobileSpacing: number, desktopSpacing: number) => number;
  contentPadding: number;
  modalPadding: number;
  buttonPaddingV: (size?: 'sm' | 'md' | 'lg') => number;
  buttonPaddingH: (size?: 'sm' | 'md' | 'lg') => number;
  buttonFontSize: (size?: 'sm' | 'md' | 'lg') => number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isSmallMobile = width < 380;
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;
  const isWide = width >= 1280;

  const scaleFont = (baseSize: number, minSize: number = Math.round(baseSize * 0.8)): number => {
    if (isSmallMobile) {
      return Math.max(minSize, Math.round(baseSize * 0.85));
    }
    if (isMobile) {
      return Math.max(minSize, Math.round(baseSize * 0.92));
    }
    if (isTablet) {
      return baseSize;
    }
    return baseSize;
  };

  const getSpacing = (mobileSpacing: number, desktopSpacing: number): number => {
    return isMobile ? mobileSpacing : desktopSpacing;
  };

  const contentPadding = isSmallMobile ? 10 : isMobile ? 14 : 24;
  const modalPadding = isSmallMobile ? 8 : isMobile ? 12 : 24;

  const buttonPaddingV = (size: 'sm' | 'md' | 'lg' = 'md'): number => {
    if (isSmallMobile) {
      if (size === 'sm') return 5;
      if (size === 'lg') return 10;
      return 8;
    }
    if (isMobile) {
      if (size === 'sm') return 6;
      if (size === 'lg') return 12;
      return 9;
    }
    // Tablet & Desktop
    if (size === 'sm') return 7;
    if (size === 'lg') return 14;
    return 10;
  };

  const buttonPaddingH = (size: 'sm' | 'md' | 'lg' = 'md'): number => {
    if (isSmallMobile) {
      if (size === 'sm') return 8;
      if (size === 'lg') return 14;
      return 10;
    }
    if (isMobile) {
      if (size === 'sm') return 10;
      if (size === 'lg') return 16;
      return 12;
    }
    // Tablet & Desktop
    if (size === 'sm') return 12;
    if (size === 'lg') return 24;
    return 16;
  };

  const buttonFontSize = (size: 'sm' | 'md' | 'lg' = 'md'): number => {
    if (isSmallMobile) {
      if (size === 'sm') return 11.5;
      if (size === 'lg') return 14;
      return 13;
    }
    if (isMobile) {
      if (size === 'sm') return 12;
      if (size === 'lg') return 15;
      return 13.5;
    }
    if (size === 'sm') return 13;
    if (size === 'lg') return 16;
    return 14.5;
  };

  return {
    width,
    height,
    isSmallMobile,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    scaleFont,
    getSpacing,
    contentPadding,
    modalPadding,
    buttonPaddingV,
    buttonPaddingH,
    buttonFontSize,
  };
}
