import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { useAppTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import {
  adminService,
  AdminUserSummary,
  SystemStats,
} from '@/services/adminService';

interface AdminModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<'users' | 'stats'>('users');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ROLE_ADMIN' | 'ROLE_USER'>('ALL');

  // Create Admin Form State
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllUsers({
        search: search.trim() || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        page: 0,
        size: 50,
      });
      setUsers(res.content || []);
    } catch (err: any) {
      setToast({
        id: 'err-users',
        type: 'error',
        message: err.message || 'Failed to load users',
      });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminService.getSystemStats();
      setStats(res);
    } catch (err: any) {
      setToast({
        id: 'err-stats',
        type: 'error',
        message: err.message || 'Failed to load system stats',
      });
    }
  }, []);

  useEffect(() => {
    if (visible) {
      if (activeTab === 'users') {
        fetchUsers();
      } else {
        fetchStats();
      }
    }
  }, [visible, activeTab, fetchUsers, fetchStats]);

  // Promote / Demote user
  const handleToggleRole = async (user: AdminUserSummary) => {
    const newRole = user.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
    setActionLoadingId(user.id);
    try {
      await adminService.updateUserRole(user.id, newRole);
      setToast({
        id: `role-${user.id}`,
        type: 'success',
        message: `Updated ${user.name}'s role to ${newRole === 'ROLE_ADMIN' ? 'Admin' : 'User'}`,
      });
      // Refresh user list
      fetchUsers();
    } catch (err: any) {
      setToast({
        id: `err-${user.id}`,
        type: 'error',
        message: err.message || 'Failed to update user role',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Enable / Disable user
  const handleToggleStatus = async (user: AdminUserSummary) => {
    setActionLoadingId(user.id);
    try {
      await adminService.updateUserStatus(user.id, !user.enabled);
      setToast({
        id: `status-${user.id}`,
        type: 'success',
        message: `Account for ${user.name} is now ${!user.enabled ? 'Active' : 'Disabled'}`,
      });
      fetchUsers();
    } catch (err: any) {
      setToast({
        id: `err-status-${user.id}`,
        type: 'error',
        message: err.message || 'Failed to update account status',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create new Administrator Account
  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
      setToast({ id: 'create-val-1', type: 'error', message: 'All fields are required' });
      return;
    }
    if (newAdminPassword.length < 6) {
      setToast({ id: 'create-val-2', type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }
    setCreatingAdmin(true);
    setToast(null);
    try {
      await adminService.createAdmin({
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword,
      });
      setToast({
        id: 'create-ok',
        type: 'success',
        message: `Administrator '${newAdminName.trim()}' created successfully!`,
      });
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setShowCreateAdmin(false);
      fetchUsers();
    } catch (err: any) {
      setToast({
        id: 'create-err',
        type: 'error',
        message: err.message || 'Failed to create administrator',
      });
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="🛡️ Administrator Control Center">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('users')}
          style={[
            styles.tabItem,
            activeTab === 'users' && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'users' ? colors.primary : colors.textSecondary },
            ]}>
            👥 Users ({users.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('stats')}
          style={[
            styles.tabItem,
            activeTab === 'stats' && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'stats' ? colors.primary : colors.textSecondary },
            ]}>
            📊 System Overview
          </Text>
        </Pressable>
      </View>

      {/* TAB: USERS */}
      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
          {/* Header Action Bar */}
          <View style={styles.usersHeaderRow}>
            <Text style={[styles.usersSubtitle, { color: colors.textSecondary }]}>
              Traverse and manage user permissions
            </Text>
            <Button
              title={showCreateAdmin ? '✕ Cancel' : '+ Create Admin'}
              size="sm"
              variant={showCreateAdmin ? 'outline' : 'primary'}
              onPress={() => setShowCreateAdmin(!showCreateAdmin)}
            />
          </View>

          {/* Create Admin Form Card */}
          {showCreateAdmin && (
            <View
              style={[
                styles.createAdminCard,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.primary,
                },
              ]}>
              <Text style={[styles.createAdminTitle, { color: colors.text }]}>
                🛡️ Register New Administrator
              </Text>
              <Text style={[styles.createAdminSubtitle, { color: colors.textSecondary }]}>
                Only System Administrators have the authority to create new admin accounts.
              </Text>

              <Input
                label="Full Name"
                placeholder="e.g. Dr. Eleanor Vance"
                value={newAdminName}
                onChangeText={setNewAdminName}
              />
              <Input
                label="Administrator Email"
                placeholder="admin.eleanor@medipcr.com"
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Input
                label="Initial Password (min 6 chars)"
                placeholder="••••••••"
                value={newAdminPassword}
                onChangeText={setNewAdminPassword}
                secureTextEntry
              />

              <View style={styles.createAdminButtonRow}>
                <Button
                  title="Create Administrator"
                  onPress={handleCreateAdmin}
                  loading={creatingAdmin}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowCreateAdmin(false);
                    setNewAdminName('');
                    setNewAdminEmail('');
                    setNewAdminPassword('');
                  }}
                />
              </View>
            </View>
          )}

          {/* Search and Filters */}
          <View style={styles.filterSection}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={fetchUsers}
            />

            <View style={styles.pillRow}>
              {(['ALL', 'ROLE_ADMIN', 'ROLE_USER'] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRoleFilter(r)}
                  style={[
                    styles.filterPill,
                    roleFilter === r
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}>
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: roleFilter === r ? '#FFF' : colors.textSecondary },
                    ]}>
                    {r === 'ALL' ? 'All Roles' : r === 'ROLE_ADMIN' ? '🛡️ Admins' : '👤 Users'}
                  </Text>
                </Pressable>
              ))}

              <Button
                title="Refresh"
                variant="outline"
                size="sm"
                onPress={fetchUsers}
                loading={loading}
              />
            </View>
          </View>

          {/* User List */}
          {loading && users.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={{ color: colors.textSecondary }}>No users found.</Text>
            </View>
          ) : (
            <ScrollView style={styles.userListScroll} contentContainerStyle={{ gap: Spacing.two }}>
              {users.map((u) => {
                const isAdmin = u.role === 'ROLE_ADMIN';
                const isOperating = actionLoadingId === u.id;

                return (
                  <View
                    key={u.id}
                    style={[
                      styles.userCard,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                        borderColor: isAdmin ? colors.primary : colors.border,
                      },
                    ]}>
                    <View style={styles.userCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.userName, { color: colors.text }]}>
                            {u.name}
                          </Text>
                          {/* Role Badge */}
                          <View
                            style={[
                              styles.badge,
                              isAdmin
                                ? { backgroundColor: colors.primary }
                                : { backgroundColor: isDark ? '#2A2E33' : '#E2E8F0' },
                            ]}>
                            <Text
                              style={[
                                styles.badgeText,
                                { color: isAdmin ? '#FFF' : colors.text },
                              ]}>
                              {isAdmin ? '🛡️ ADMIN' : 'USER'}
                            </Text>
                          </View>
                          {/* Status Badge */}
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: u.enabled ? '#10B98125' : '#EF444425' },
                            ]}>
                            <Text
                              style={[
                                styles.badgeText,
                                { color: u.enabled ? '#10B981' : '#EF4444' },
                              ]}>
                              {u.enabled ? 'ACTIVE' : 'DISABLED'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                          {u.email}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata & Counts */}
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaItem, { color: colors.textMuted }]}>
                        Prescriptions: <Text style={{ color: colors.text }}>{u.prescriptionsCount}</Text>
                      </Text>
                      <Text style={[styles.metaItem, { color: colors.textMuted }]}>
                        Files: <Text style={{ color: colors.text }}>{u.filesCount}</Text>
                      </Text>
                      <Text style={[styles.metaItem, { color: colors.textMuted }]}>
                        Reminders: <Text style={{ color: colors.text }}>{u.remindersCount}</Text>
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionButtonRow}>
                      <Button
                        title={isAdmin ? 'Demote to User' : 'Promote to Admin'}
                        variant={isAdmin ? 'outline' : 'primary'}
                        size="sm"
                        disabled={isOperating}
                        loading={isOperating}
                        onPress={() => handleToggleRole(u)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={u.enabled ? 'Suspend' : 'Activate'}
                        variant={u.enabled ? 'outline' : 'primary'}
                        size="sm"
                        disabled={isOperating}
                        onPress={() => handleToggleStatus(u)}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* TAB: SYSTEM OVERVIEW */}
      {activeTab === 'stats' && (
        <ScrollView contentContainerStyle={styles.statsContainer}>
          {stats ? (
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalUsers}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Total Users</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.activeUsers}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Active Users</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.adminUsers}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Administrators</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.regularUsers}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Standard Users</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalPrescriptions}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Total Prescriptions</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalFiles}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Uploaded Files</Text>
              </View>
            </View>
          ) : (
            <ActivityIndicator size="large" color={colors.primary} />
          )}
        </ScrollView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  tabItem: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterSection: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    fontSize: 14,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userListScroll: {
    maxHeight: 480,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12.5,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginVertical: Spacing.two,
  },
  metaItem: {
    fontSize: 11.5,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statsContainer: {
    paddingVertical: Spacing.two,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statBox: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  usersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  usersSubtitle: {
    fontSize: 12.5,
    flex: 1,
    minWidth: 200,
  },
  createAdminCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  createAdminTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  createAdminSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.two,
  },
  createAdminButtonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
