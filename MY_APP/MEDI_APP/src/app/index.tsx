import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/common/Header';
import { FileList } from '@/components/files/FileList';
import { PrescriptionScanner } from '@/components/scanner/PrescriptionScanner';
import { PrescriptionList } from '@/components/prescriptions/PrescriptionList';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProfileSettings } from '@/components/auth/ProfileSettings';
import { AdminModal } from '@/components/admin/AdminModal';
import { EmergencyQrCard } from '@/components/profile/EmergencyQrCard';
import { ReminderNotificationCard } from '@/components/profile/ReminderNotificationCard';
import { ProfileCompletionModal } from '@/components/profile/ProfileCompletionModal';
import { PublicEmergencyModal } from '@/components/profile/PublicEmergencyModal';
import { profileService, EmergencyProfile } from '@/services/profileService';
import { DietChatbotModal } from '@/components/diet/DietChatbotModal';
import { Button } from '@/components/common/Button';
import {
  ScanIcon,
  PillIcon,
  FileTextIcon,
  UserIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
  ClockIcon,
  HeartPulseIcon,
  InfoIcon,
  QrCodeIcon,
  DietIcon,
} from '@/components/common/Icons';
import { BorderRadius, Spacing, MaxContentWidth } from '@/constants/theme';

type MainTab = 'scanner' | 'prescriptions' | 'files' | 'diet' | 'profile' | 'about';

export default function HomeScreen() {
  const { colors, isDark, theme } = useAppTheme();
  const { user, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 640;

  const [activeTab, setActiveTab] = useState<MainTab>('scanner');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyPreviewOpen, setEmergencyPreviewOpen] = useState(false);
  const [dietModalOpen, setDietModalOpen] = useState(false);
  const [emergencyProfile, setEmergencyProfile] = useState<EmergencyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadEmergencyProfile();
    } else {
      setEmergencyProfile(null);
    }
  }, [isAuthenticated, activeTab]);

  const loadEmergencyProfile = async () => {
    try {
      setLoadingProfile(true);
      const data = await profileService.getMyProfile();
      setEmergencyProfile(data);
    } catch (err) {
      // uninitialized profile is handled
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}>
      {/* Top Header with Brand & Day/Night Toggle */}
      <Header
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isMobile ? 96 : Spacing.seven },
        ]}>
        {/* Hero / Welcome Section */}
        <View
          style={[
            styles.heroBanner,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.heroTextContainer}>
            <View
              style={[
                styles.brandTag,
                { backgroundColor: colors.primaryLight, borderColor: colors.border },
              ]}>
              <HeartPulseIcon size={14} color={colors.primary} />
              <Text style={[styles.brandTagText, { color: colors.primary }]}>
                MEDI-PCR CLINICAL PLATFORM
              </Text>
            </View>

            {isAuthenticated ? (
              <>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  Welcome, <Text style={{ color: colors.primary }}>{user?.name || 'Healthcare Practitioner'}</Text>
                </Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  AI-powered prescription extraction, strict dosage scheduling, and Cloudinary medical diagnostics.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  AI-Powered Prescription Engine & Records
                </Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  Scan handwritten or printed prescriptions with Gemini 2.5 Flash, automatically compute frequency rules, and sync directly to Spring Boot backend.
                </Text>
                <View style={styles.heroActionRow}>
                  <Button
                    title="Get Started / Sign In"
                    variant="primary"
                    onPress={() => setAuthModalOpen(true)}
                  />
                </View>
              </>
            )}
          </View>

          {/* Quick Stats / Info Badges (When Authenticated) */}
          {isAuthenticated && (
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}>
                <ShieldCheckIcon size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {user?.enabled ? 'Verified' : 'Pending'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Account Status
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setActiveTab('profile');
                  if (!emergencyProfile?.qrCodeDataUrl) {
                    setEmergencyModalOpen(true);
                  }
                }}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surfaceElevated,
                    borderColor: (emergencyProfile?.isComplete || (emergencyProfile as any)?.complete || emergencyProfile?.qrCodeDataUrl)
                      ? colors.primary
                      : colors.border,
                  },
                ]}>
                <QrCodeIcon
                  size={20}
                  color={(emergencyProfile?.isComplete || (emergencyProfile as any)?.complete || emergencyProfile?.qrCodeDataUrl)
                    ? colors.primary
                    : colors.warning}
                />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {(emergencyProfile?.isComplete || (emergencyProfile as any)?.complete || emergencyProfile?.qrCodeDataUrl)
                    ? 'Active'
                    : 'Setup'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Emergency QR
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Desktop / Tablet Tab Navigation Bar */}
        {!isMobile && (
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                borderColor: colors.border,
              },
            ]}>
          {/* Tab 1: AI Prescription Scanner */}
          <Pressable
            onPress={() => setActiveTab('scanner')}
            style={[
              styles.tabButton,
              activeTab === 'scanner' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <ScanIcon
              size={16}
              color={activeTab === 'scanner' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'scanner' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'scanner' ? '700' : '500',
                },
              ]}>
              AI Scanner
            </Text>
          </Pressable>

          {/* Tab 2: Prescriptions & Reminders */}
          <Pressable
            onPress={() => setActiveTab('prescriptions')}
            style={[
              styles.tabButton,
              activeTab === 'prescriptions' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <PillIcon
              size={16}
              color={activeTab === 'prescriptions' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'prescriptions' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'prescriptions' ? '700' : '500',
                },
              ]}>
              Prescriptions & Rx
            </Text>
          </Pressable>

          {/* Tab 3: Medical Files */}
          <Pressable
            onPress={() => setActiveTab('files')}
            style={[
              styles.tabButton,
              activeTab === 'files' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <FileTextIcon
              size={16}
              color={activeTab === 'files' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'files' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'files' ? '700' : '500',
                },
              ]}>
              Lab Reports & Files
            </Text>
          </Pressable>

          {/* Tab: AI Diet & Fitness Coach */}
          <Pressable
            onPress={() => setActiveTab('diet')}
            style={[
              styles.tabButton,
              activeTab === 'diet' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <DietIcon
              size={16}
              color={activeTab === 'diet' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'diet' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'diet' ? '700' : '500',
                },
              ]}>
              AI Diet & Fitness
            </Text>
          </Pressable>

          {/* Tab 4: User Profile & Emergency QR */}
          {isAuthenticated && (
            <Pressable
              onPress={() => setActiveTab('profile')}
              style={[
                styles.tabButton,
                activeTab === 'profile' && {
                  backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                  borderColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}>
              <QrCodeIcon
                size={16}
                color={activeTab === 'profile' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: activeTab === 'profile' ? colors.primary : colors.textSecondary,
                    fontWeight: activeTab === 'profile' ? '700' : '500',
                  },
                ]}>
                Emergency ID & Profile
              </Text>
            </Pressable>
          )}

          {/* Tab 5: About */}
          <Pressable
            onPress={() => setActiveTab('about')}
            style={[
              styles.tabButton,
              activeTab === 'about' && {
                backgroundColor: isDark ? colors.primaryLight : colors.surfaceElevated,
                borderColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <InfoIcon
              size={16}
              color={activeTab === 'about' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'about' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'about' ? '700' : '500',
                },
              ]}>
              About
            </Text>
          </Pressable>
        </View>
        )}

        {/* Tab View Content */}
        <View style={styles.tabContentArea}>
          {/* TAB 1: AI SCANNER */}
          {activeTab === 'scanner' && (
            <PrescriptionScanner
              onSavedSuccess={() => setActiveTab('prescriptions')}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}

          {/* TAB 2: PRESCRIPTIONS & REMINDERS */}
          {activeTab === 'prescriptions' && (
            <PrescriptionList
              onOpenScanner={() => setActiveTab('scanner')}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}

          {/* TAB 3: MEDICAL FILES */}
          {activeTab === 'files' && (
            <FileList onOpenAuth={() => setAuthModalOpen(true)} />
          )}

          {/* TAB: AI DIET & FITNESS COACH */}
          {activeTab === 'diet' && (
            <DietChatbotModal
              isFullScreenTab={true}
              visible={true}
              onClose={() => setActiveTab('scanner')}
            />
          )}

          {/* TAB 4: PROFILE & EMERGENCY QR */}
          {activeTab === 'profile' && isAuthenticated && (
            <View>
              {/* Emergency QR Medical ID Card */}
              <EmergencyQrCard
                profile={emergencyProfile}
                onEditProfile={() => setEmergencyModalOpen(true)}
                onPreviewEmergency={() => setEmergencyPreviewOpen(true)}
                onProfileUpdated={(updated) => setEmergencyProfile(updated)}
              />

              {/* Medication Alarm & Push Notification Reminders Card */}
              <ReminderNotificationCard />

              {/* User Account & Security Overview */}
              <View
                style={[
                  styles.profileTabCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.profileSectionTitle, { color: colors.text }]}>
                  User Account & Security Overview
                </Text>
                <Text style={[styles.profileSectionSubtitle, { color: colors.textSecondary }]}>
                  Manage your clinical credentials, personal profile photo, and password security.
                </Text>

                <View style={styles.profileDetailsGrid}>
                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                      Full Name
                    </Text>
                    <Text style={[styles.profileValue, { color: colors.text }]}>
                      {user?.name}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                      Email Address
                    </Text>
                    <Text style={[styles.profileValue, { color: colors.text }]}>
                      {user?.email}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                      Account Status
                    </Text>
                    <Text
                      style={[
                        styles.profileValue,
                        { color: user?.enabled ? colors.success : colors.warning },
                      ]}>
                      {user?.enabled ? 'Active & Verified' : 'Pending Verification'}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                      Emergency ID Status
                    </Text>
                    <Text
                      style={[
                        styles.profileValue,
                        {
                          color: (emergencyProfile?.isComplete || (emergencyProfile as any)?.complete || emergencyProfile?.qrCodeDataUrl)
                            ? colors.success
                            : colors.warning,
                        },
                      ]}>
                      {(emergencyProfile?.isComplete || (emergencyProfile as any)?.complete || emergencyProfile?.qrCodeDataUrl)
                        ? 'Active & Scannable'
                        : 'Incomplete Profile'}
                    </Text>
                  </View>
                </View>

                <Button
                  title="Update Photo & Password"
                  variant="outline"
                  onPress={() => setProfileModalOpen(true)}
                  style={{ marginTop: Spacing.four }}
                />
              </View>
            </View>
          )}

          {/* TAB 5: ABOUT */}
          {activeTab === 'about' && (
            <View
              style={[
                styles.aboutCard,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <Text style={[styles.aboutTitle, { color: colors.text }]}>
                About MEDI-PCR
              </Text>
              <Text style={[styles.aboutParagraph, { color: colors.textSecondary }]}>
                MEDI-PCR combines client-side Gemini AI image OCR with Spring Boot healthcare endpoints to automate medication schedule deductions, reminder planning, and clinical record management.
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <ScanIcon size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureHeading, { color: colors.text }]}>
                      Client-Side Gemini 2.5 Flash OCR
                    </Text>
                    <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                      Extracts patient, doctor, and dosage details directly in your browser without uploading raw prescription files to third-party stores.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <PillIcon size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureHeading, { color: colors.text }]}>
                      Strict Frequency & Liquid Rules
                    </Text>
                    <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                      Deduces Morning, Afternoon, Evening, and Night intervals based on strict logic rules ('O'/'0' vs lines) and automatically calculates liquid/syrup durations.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <UploadCloudIcon size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureHeading, { color: colors.text }]}>
                      Cloudinary Lab Reports Storage
                    </Text>
                    <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                      Direct upload of blood tests, scans, and PDFs up to 100MB with rapid keyword search and download capabilities.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerBrand, { color: colors.text }]}>
            MEDI-PCR
          </Text>
          <Text style={[styles.footerCopy, { color: colors.textMuted }]}>
            Connected to Spring Boot API v1.1 • Responsive Health Platform (Beige & Green)
          </Text>
        </View>
      </ScrollView>

      {/* Auth Modal */}
      <AuthModal
        visible={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Admin Control Center Modal */}
      <AdminModal
        visible={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      {/* Profile Settings Modal */}
      <ProfileSettings
        visible={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Emergency Profile Completion Modal */}
      <ProfileCompletionModal
        visible={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        initialProfile={emergencyProfile}
        onSaved={(saved) => {
          setEmergencyProfile(saved);
        }}
      />

      {/* Public Emergency Card Preview Modal */}
      <PublicEmergencyModal
        visible={emergencyPreviewOpen}
        onClose={() => setEmergencyPreviewOpen(false)}
        profile={emergencyProfile}
      />

      {/* Floating AI Diet & Fitness Button (Desktop/Tablet Only) */}
      {!isMobile && (
        <Pressable
          onPress={() => setDietModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open AI Diet & Fitness Coach"
          style={({ pressed }) => [
            styles.floatingDietFab,
            {
              backgroundColor: colors.primary,
              bottom: 28,
              right: 28,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}>
          <View style={styles.fabIconBadge}>
            <DietIcon size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.floatingDietFabText}>
            ✨ AI Diet & Fitness
          </Text>
        </Pressable>
      )}

      {/* Floating Diet & Fitness Chatbot Modal */}
      <DietChatbotModal
        visible={dietModalOpen}
        onClose={() => setDietModalOpen(false)}
      />

      {/* Mobile Android Bottom Navigation Bar */}
      {isMobile && (
        <View
          style={[
            styles.mobileBottomNav,
            {
              backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
              borderTopColor: colors.border,
            },
          ]}>
          {/* Tab 1: Scanner */}
          <Pressable
            onPress={() => setActiveTab('scanner')}
            style={styles.mobileNavItem}
            android_ripple={{ color: colors.primaryLight, borderless: true }}>
            <View
              style={[
                styles.mobileNavIconWrap,
                activeTab === 'scanner' && { backgroundColor: colors.primaryLight },
              ]}>
              <ScanIcon
                size={20}
                color={activeTab === 'scanner' ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'scanner' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'scanner' ? '700' : '500',
                },
              ]}>
              Scanner
            </Text>
          </Pressable>

          {/* Tab 2: Medicines */}
          <Pressable
            onPress={() => setActiveTab('prescriptions')}
            style={styles.mobileNavItem}
            android_ripple={{ color: colors.primaryLight, borderless: true }}>
            <View
              style={[
                styles.mobileNavIconWrap,
                activeTab === 'prescriptions' && { backgroundColor: colors.primaryLight },
              ]}>
              <PillIcon
                size={20}
                color={activeTab === 'prescriptions' ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'prescriptions' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'prescriptions' ? '700' : '500',
                },
              ]}>
              Medicines
            </Text>
          </Pressable>

          {/* Tab 3: Reports */}
          <Pressable
            onPress={() => setActiveTab('files')}
            style={styles.mobileNavItem}
            android_ripple={{ color: colors.primaryLight, borderless: true }}>
            <View
              style={[
                styles.mobileNavIconWrap,
                activeTab === 'files' && { backgroundColor: colors.primaryLight },
              ]}>
              <FileTextIcon
                size={20}
                color={activeTab === 'files' ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'files' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'files' ? '700' : '500',
                },
              ]}>
              Reports
            </Text>
          </Pressable>

          {/* Tab 4: AI Diet & Fitness Coach */}
          <Pressable
            onPress={() => setActiveTab('diet')}
            style={styles.mobileNavItem}
            android_ripple={{ color: colors.primaryLight, borderless: true }}>
            <View
              style={[
                styles.mobileNavIconWrap,
                activeTab === 'diet' && { backgroundColor: colors.primaryLight },
              ]}>
              <DietIcon
                size={20}
                color={activeTab === 'diet' ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'diet' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'diet' ? '700' : '500',
                },
              ]}>
              AI Coach
            </Text>
          </Pressable>

          {/* Tab 5: Profile & Emergency QR */}
          <Pressable
            onPress={() => {
              if (isAuthenticated) {
                setActiveTab('profile');
              } else {
                setAuthModalOpen(true);
              }
            }}
            style={styles.mobileNavItem}
            android_ripple={{ color: colors.primaryLight, borderless: true }}>
            <View
              style={[
                styles.mobileNavIconWrap,
                activeTab === 'profile' && { backgroundColor: colors.primaryLight },
              ]}>
              <QrCodeIcon
                size={20}
                color={activeTab === 'profile' ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'profile' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'profile' ? '700' : '500',
                },
              ]}>
              {isAuthenticated ? 'Profile' : 'Sign In'}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.seven,
  },
  heroBanner: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.five,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTextContainer: {
    maxWidth: 720,
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.full,
    borderWidth: 0.5,
    marginBottom: Spacing.two,
  },
  brandTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: Spacing.two,
  },
  heroSubtitle: {
    fontSize: 14.5,
    lineHeight: 22,
    marginBottom: Spacing.three,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two * 1.5,
    marginTop: Spacing.four,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11.5,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.one,
    marginBottom: Spacing.four,
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  tabButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two * 1.2,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    cursor: 'pointer' as any,
  },
  tabButtonText: {
    fontSize: 13,
  },
  tabContentArea: {
    width: '100%',
    minHeight: 320,
  },
  profileTabCard: {
    padding: Spacing.five,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  profileSectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: Spacing.half,
  },
  profileSectionSubtitle: {
    fontSize: 13.5,
    marginBottom: Spacing.four,
  },
  profileDetailsGrid: {
    gap: Spacing.three,
  },
  profileField: {
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  profileValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  aboutCard: {
    padding: Spacing.five,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  aboutParagraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.four,
  },
  featuresList: {
    gap: Spacing.four,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: Spacing.six,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  footerCopy: {
    fontSize: 11.5,
    textAlign: 'center',
  },
  floatingDietFab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    zIndex: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDietFabText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mobileBottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.one * 1.5,
    paddingBottom: Spacing.two * 1.5,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 999,
  },
  mobileNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    cursor: 'pointer' as any,
  },
  mobileNavIconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: 2,
  },
  mobileNavLabel: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
});