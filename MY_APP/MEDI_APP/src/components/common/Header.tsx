import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Button } from './Button';
import { SunIcon, MoonIcon, MedicalCrossIcon } from './Icons';

interface HeaderProps {
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth, onOpenProfile, onOpenAdmin }) => {
  const { colors, theme, toggleTheme, isDark } = useAppTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isMobile, isSmallMobile } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
          borderBottomColor: colors.border,
          paddingHorizontal: isSmallMobile ? 10 : isMobile ? 14 : Spacing.four,
          paddingVertical: isSmallMobile ? 8 : Spacing.two * 1.3,
        },
      ]}>
      <View style={styles.content}>
        {/* Brand Logo & Name */}
        <View style={styles.brandRow}>
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: colors.primary,
                width: isSmallMobile ? 28 : 34,
                height: isSmallMobile ? 28 : 34,
              },
            ]}>
            <MedicalCrossIcon size={isSmallMobile ? 16 : 18} color={isDark ? '#0E1612' : '#FFFFFF'} />
          </View>
          <View>
            <Text
              style={[
                styles.brandTitle,
                {
                  color: colors.text,
                  fontSize: isSmallMobile ? 16 : isMobile ? 18 : 20,
                },
              ]}>
              MEDI<Text style={{ color: colors.primary }}>-PCR</Text>
            </Text>
            {!isSmallMobile && (
              <Text
                numberOfLines={1}
                style={[
                  styles.brandSubtitle,
                  {
                    color: colors.textSecondary,
                    fontSize: isMobile ? 10 : 11,
                  },
                ]}>
                {isMobile ? 'Clinical Portal' : 'Clinical Health & Diagnostics Portal'}
              </Text>
            )}
          </View>
        </View>

        {/* Action Controls: Day/Night Switch & Auth */}
        <View style={[styles.actionsRow, { gap: isSmallMobile ? 6 : Spacing.two }]}>
          {/* Day / Night Theme Switcher */}
          <Pressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${theme === 'light' ? 'Night' : 'Day'} mode`}
            style={({ pressed }) => [
              styles.themeToggle,
              {
                backgroundColor: pressed
                  ? colors.surfaceHighlight
                  : isDark
                  ? colors.surfaceHighlight
                  : colors.surface,
                borderColor: colors.border,
                paddingHorizontal: isSmallMobile ? 6 : isMobile ? 8 : Spacing.three,
                paddingVertical: isSmallMobile ? 4 : Spacing.one * 1.2,
              },
            ]}>
            {theme === 'light' ? (
              <SunIcon size={isSmallMobile ? 14 : 16} color={colors.warning} />
            ) : (
              <MoonIcon size={isSmallMobile ? 14 : 16} color={colors.primary} />
            )}
            {!isSmallMobile && (
              <Text
                style={[
                  styles.themeLabel,
                  { color: colors.text, fontSize: isMobile ? 11.5 : 12.5 },
                ]}>
                {theme === 'light' ? 'Day' : 'Night'}
              </Text>
            )}
          </Pressable>

          {/* Admin Panel Button if user is Admin */}
          {isAuthenticated && isAdmin && onOpenAdmin && (
            <Button
              title={isSmallMobile ? '🛡️ Admin' : '🛡️ Admin Panel'}
              variant="primary"
              size="sm"
              onPress={onOpenAdmin}
            />
          )}

          {/* User Profile / Login */}
          {isAuthenticated ? (
            <View style={[styles.userProfileRow, { gap: isSmallMobile ? 4 : Spacing.two }]}>
              <Pressable
                onPress={onOpenProfile}
                style={({ pressed }) => [
                  styles.profileButton,
                  {
                    backgroundColor: pressed ? colors.primaryLight : colors.surface,
                    borderColor: colors.border,
                    maxWidth: isSmallMobile ? 110 : isMobile ? 130 : 160,
                    paddingHorizontal: isSmallMobile ? 4 : Spacing.two,
                  },
                ]}>
                {user?.profilePicture ? (
                  <Image
                    source={{ uri: user.profilePicture }}
                    style={[styles.avatarImage, isSmallMobile && { width: 22, height: 22 }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: colors.primary },
                      isSmallMobile && { width: 22, height: 22 },
                    ]}>
                    <Text
                      style={[
                        styles.avatarLetter,
                        { color: isDark ? '#0E1612' : '#FFFFFF' },
                        isSmallMobile && { fontSize: 10 },
                      ]}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.userName,
                    {
                      color: colors.text,
                      maxWidth: isSmallMobile ? 60 : isMobile ? 70 : 90,
                      fontSize: isSmallMobile ? 11.5 : 12.5,
                    },
                  ]}>
                  {user?.name || 'Account'}
                </Text>
              </Pressable>
              <Button
                title="Sign Out"
                variant="outline"
                size="sm"
                onPress={logout}
              />
            </View>
          ) : (
            <Button
              title="Sign In"
              variant="primary"
              size="sm"
              onPress={onOpenAuth}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: 1,
    zIndex: 10,
  },
  content: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoBadge: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontWeight: '500',
    marginTop: -2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  themeLabel: {
    fontWeight: '600',
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  avatarImage: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
  },
  avatarFallback: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 12,
    fontWeight: '700',
  },
  userName: {
    fontWeight: '600',
  },
});
