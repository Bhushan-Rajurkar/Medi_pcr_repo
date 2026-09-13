import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Brand & Theme: Beige and Green (Day Mode)
    name: 'Day' as string,
    background: '#FAF7F2',         // Soft Alabaster Beige
    surface: '#F3EDE2',            // Warm Linen Oat
    surfaceElevated: '#FFFFFF',    // Crisp Card / Modal
    surfaceHighlight: '#EFE6D8',   // Highlighted element

    // Green Accents
    primary: '#1C5936',            // Botanical Forest Green
    primaryHover: '#246E44',       // Forest Green Hover
    primaryLight: '#E6F3EB',       // Soft Mint Badge / Background
    accentSage: '#5B8769',         // Muted Herbal Sage
    accentMint: '#D4EAD9',         // Mint accent

    // Borders & Dividers
    border: '#E4DCCE',             // Soft Beige Border
    borderStrong: '#CEC1AD',       // Darker Beige Outline

    // Typography
    text: '#17231B',               // Deep Forest Charcoal
    textSecondary: '#546358',      // Earthen Slate
    textMuted: '#849388',          // Muted Sage Grey
    textInverted: '#FFFFFF',       // Clean White on Green

    // Feedback
    success: '#16A34A',
    successBg: '#DCFCE7',
    warning: '#D97706',            // Amber Complementary
    warningBg: '#FEF3C7',
    danger: '#DC2626',             // Crimson Red
    dangerBg: '#FEE2E2',

    // Compatible legacy tokens
    backgroundElement: '#F3EDE2',
    backgroundSelected: '#E6F3EB',
  },
  dark: {
    // Brand & Theme: Beige and Green (Night Mode)
    name: 'Night' as string,
    background: '#0E1612',         // Deep Pine Night
    surface: '#16221C',            // Dark Spruce Surface
    surfaceElevated: '#1F2F27',    // Elevated Pine Card / Modal
    surfaceHighlight: '#293C32',   // Highlighted element

    // Green Accents
    primary: '#34D399',            // Vibrant Jade / Emerald
    primaryHover: '#10B981',       // Emerald Hover
    primaryLight: '#143828',       // Dark Emerald Sheen
    accentSage: '#78A487',         // Luminous Sage
    accentMint: '#1D4532',         // Dark Mint accent

    // Borders & Dividers
    border: '#26372E',             // Spruce Border
    borderStrong: '#364D40',       // Defined Spruce Border

    // Typography
    text: '#F5F1E8',               // Warm Parchment Beige
    textSecondary: '#A0B2A7',      // Pale Pine Muted
    textMuted: '#687B70',          // Deep Spruce Muted
    textInverted: '#0E1612',       // Dark on bright green

    // Feedback
    success: '#34D399',
    successBg: '#0E2E1F',
    warning: '#FBBF24',            // Luminous Amber
    warningBg: '#342508',
    danger: '#F87171',             // Soft Crimson
    dangerBg: '#381616',

    // Compatible legacy tokens
    backgroundElement: '#16221C',
    backgroundSelected: '#1F2F27',
  },
};

export type ThemeType = 'light' | 'dark';
export type ThemeColor = keyof typeof Colors.light;
export type ThemeColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: 'Georgia, serif',
    rounded: "Outfit, 'Quicksand', sans-serif",
    mono: 'ui-monospace, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1100;

export const Shadows = {
  sm: Platform.select({
    web: { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
  }),
  md: Platform.select({
    web: { boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.12)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 5,
      elevation: 4,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
  }),
  xl: Platform.select({
    web: { boxShadow: '0 20px 35px -8px rgba(0, 0, 0, 0.25)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 12,
    },
  }),
};
