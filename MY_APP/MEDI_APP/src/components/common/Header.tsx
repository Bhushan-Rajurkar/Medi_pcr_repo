import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
          borderBottomColor: colors.border,
        },
      ]}>
      <View style={styles.content}>
        {/* Brand Logo & Name */}
        <View style={styles.brandRow}>
          <View
            style={[
              styles.logoBadge,
              { backgroundColor: colors.primary },
            ]}>
            <MedicalCrossIcon size={20} color={isDark ? '#0E1612' : '#FFFFFF'} />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              MEDI<Text style={{ color: colors.primary }}>-PCR</Text>
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              Clinical Health & Diagnostics Portal
            </Text>
          </View>
        </View>

        {/* Action Controls: Day/Night Switch & Auth */}
        <View style={styles.actionsRow}>
          {/* Day / Night Theme Switcher */}
          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [
              styles.themeToggle,
              {
                backgroundColor: pressed
                  ? colors.surfaceHighlight
                  : isDark
                  ? colors.surfaceHighlight
                  : colors.surface,
                borderColor: colors.border,
              },
            ]}>
            {theme === 'light' ? (
              <SunIcon size={16} color={colors.warning} />
            ) : (
              <MoonIcon size={16} color={colors.primary} />
            )}
            <Text
              style={[
                styles.themeLabel,
                { color: colors.text },
              ]}>
              {theme === 'light' ? 'Day' : 'Night'}
            </Text>
          </Pressable>

          {/* Admin Panel Button if user is Admin */}
          {isAuthenticated && isAdmin && onOpenAdmin && (
            <Button
              title="🛡️ Admin Panel"
              variant="primary"
              size="sm"
              onPress={onOpenAdmin}
            />
          )}

          {/* User Profile / Login */}
          {isAuthenticated ? (
            <View style={styles.userProfileRow}>
              <Pressable
                onPress={onOpenProfile}
                style={({ pressed }) => [
                  styles.profileButton,
                  {
                    backgroundColor: pressed ? colors.primaryLight : colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                {user?.profilePicture ? (
                  <Image
                    source={{ uri: user.profilePicture }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: colors.primary },
                    ]}>
                    <Text
                      style={[
                        styles.avatarLetter,
                        { color: isDark ? '#0E1612' : '#FFFFFF' },
                      ]}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
                <Text
                  numberOfLines={1}
                  style={[styles.userName, { color: colors.text }]}>
                  {user?.name || 'My Account'}
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
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two * 1.5,
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
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: -2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one * 1.5,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  themeLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one * 1.5,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 160,
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
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 90,
  },
});
