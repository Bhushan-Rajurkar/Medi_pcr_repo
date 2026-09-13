import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { useAppTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { filePicker, PickedFile } from '@/utils/filePicker';

type AuthView = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialView?: AuthView;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  initialView = 'login',
}) => {
  const { colors, isDark } = useAppTheme();
  const { login, register } = useAuth();

  const [view, setView] = useState<AuthView>(initialView);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState<PickedFile | File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setSelectedFile(null);
    setPreviewUrl('');
    setToken('');
    setNewPassword('');
    setToast(null);
  };

  const handlePickPhoto = async () => {
    const file = await filePicker.pickImage();
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(file.uri);
    }
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const safeMessage = (val: any, fallback: string): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val.message === 'string') return val.message;
    if (typeof val.error === 'string') return val.error;
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  };

  // 1. Handle Login
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setToast({ id: '1', type: 'error', message: 'Email and password are required' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      await login(email.trim(), password);
      handleClose();
    } catch (err: any) {
      setToast({ id: 'err', type: 'error', message: safeMessage(err, 'Login failed') });
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Register
  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setToast({ id: '1', type: 'error', message: 'Name, email, and password are required' });
      return;
    }
    if (password.length < 6) {
      setToast({ id: '2', type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      let msg: string;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('email', email.trim());
        formData.append('password', password);
        filePicker.appendFile(formData, 'profilePicture', selectedFile);
        msg = await authService.registerMultipart(formData);
      } else {
        msg = await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      }
      setToast({
        id: 'reg_success',
        type: 'success',
        message: safeMessage(msg, 'Registration successful! Please check your email to activate your account.'),
      });
      // Switch to verify view
      setTimeout(() => {
        setView('verify');
      }, 1200);
    } catch (err: any) {
      setToast({ id: 'err', type: 'error', message: safeMessage(err, 'Registration failed') });
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Verify Account
  const handleVerify = async () => {
    if (!token.trim()) {
      setToast({ id: '1', type: 'error', message: 'Verification token is required' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const msg = await authService.verifyAccount(token.trim());
      setToast({
        id: 'ver_success',
        type: 'success',
        message: safeMessage(msg, 'Account activated successfully! You can now log in.'),
      });
      setTimeout(() => {
        setView('login');
      }, 1500);
    } catch (err: any) {
      setToast({ id: 'err', type: 'error', message: safeMessage(err, 'Verification failed') });
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Resend Verification Email
  const handleResendVerification = async () => {
    if (!email.trim()) {
      setToast({ id: '1', type: 'error', message: 'Email is required to resend verification' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const msg = await authService.resendVerification(email.trim());
      setToast({
        id: 'resend_success',
        type: 'success',
        message: safeMessage(msg, 'Verification email resent successfully.'),
      });
    } catch (err: any) {
      setToast({ id: 'err', type: 'error', message: safeMessage(err, 'Failed to resend email') });
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setToast({ id: '1', type: 'error', message: 'Please enter your email address' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const msg = await authService.forgotPassword(email.trim());
      setToast({
        id: 'forgot_success',
        type: 'success',
        message: safeMessage(msg, 'Password reset link sent to your email.'),
      });
      setTimeout(() => {
        setView('reset');
      }, 1500);
    } catch (err: any) {
      setToast({ id: 'err', type: 'error', message: safeMessage(err, 'Request failed') });
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Reset Password
  const handleResetPassword = async () => {
    if (!token.trim() || !newPassword.trim()) {
      setToast({ id: '1', type: 'error', message: 'Token and new password are required' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ id: '2', type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const msg = await authService.resetPassword(token.trim(), newPassword);
      setToast({
        id: 'reset_success',
        type: 'success',
        message: safeMessage(msg, 'Password reset successfully! You can now log in.'),
      });
      setTimeout(() => {
        setView('login');
      }, 1500);
    } catch (err: any) {
      setToast({ id: 'err', type: 'error', message: safeMessage(err, 'Reset password failed') });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'register':
        return 'Create MEDI-PCR Account';
      case 'verify':
        return 'Verify Your Account';
      case 'forgot':
        return 'Forgot Password';
      case 'reset':
        return 'Reset Password';
      default:
        return 'Sign In to MEDI-PCR';
    }
  };

  return (
    <Modal visible={visible} onClose={handleClose} title={getTitle()}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* VIEW: LOGIN */}
      {view === 'login' && (
        <View>
          <Input
            label="Email Address"
            placeholder="doctor@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Pressable
            onPress={() => {
              setToast(null);
              setView('forgot');
            }}
            style={styles.linkRight}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Forgot Password?
            </Text>
          </Pressable>
          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: Spacing.two }}
          />

          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary }}>Don't have an account?</Text>
            <Pressable
              onPress={() => {
                setToast(null);
                setView('register');
              }}>
              <Text style={[styles.linkText, { color: colors.primary, fontWeight: '700' }]}>
                {' '}Create Account
              </Text>
            </Pressable>
          </View>

          <View style={styles.secondaryActionRow}>
            <Pressable
              onPress={() => {
                setToast(null);
                setView('verify');
              }}>
              <Text style={[styles.linkTextMuted, { color: colors.textMuted }]}>
                Have a verification token? Verify here
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* VIEW: REGISTER */}
      {view === 'register' && (
        <View>
          <Input
            label="Full Name"
            placeholder="Dr. Jane Smith"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Email Address"
            placeholder="janesmith@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Password (min 6 chars)"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Profile Picture Upload from Device */}
          <View style={styles.photoUploadContainer}>
            <Text style={[styles.photoLabel, { color: colors.text }]}>Profile Picture (Optional)</Text>
            <View style={styles.photoRow}>
              {previewUrl ? (
                <Image source={{ uri: previewUrl }} style={styles.avatarPreview} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: isDark ? colors.surfaceHighlight : colors.surface, borderColor: colors.border },
                  ]}>
                  <Text style={{ fontSize: 24 }}>📷</Text>
                </View>
              )}

              <View style={styles.photoActions}>
                <Pressable
                  onPress={handlePickPhoto}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: isDark ? colors.surfaceHighlight : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {selectedFile ? '🔄 Change Photo' : '📁 Choose Photo'}
                  </Text>
                </Pressable>

                {selectedFile && (
                  <Pressable
                    onPress={() => {
                      setSelectedFile(null);
                      setPreviewUrl('');
                    }}
                    style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 11.5, color: colors.danger, fontWeight: '600' }}>
                      Remove photo
                    </Text>
                  </Pressable>
                )}
                <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
                  {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 'Upload JPG, PNG, or WEBP directly from device'}
                </Text>
              </View>
            </View>
          </View>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: Spacing.two }}
          />

          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary }}>Already have an account?</Text>
            <Pressable
              onPress={() => {
                setToast(null);
                setView('login');
              }}>
              <Text style={[styles.linkText, { color: colors.primary, fontWeight: '700' }]}>
                {' '}Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* VIEW: VERIFY ACCOUNT */}
      {view === 'verify' && (
        <View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Enter the activation token received in your email to activate your MEDI-PCR account.
          </Text>
          <Input
            label="Verification Token"
            placeholder="Paste token here"
            value={token}
            onChangeText={setToken}
          />
          <Button
            title="Activate Account"
            onPress={handleVerify}
            loading={loading}
            style={{ marginTop: Spacing.two }}
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Didn't receive the email?
          </Text>
          <Input
            label="Email Address"
            placeholder="your-email@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <Button
            title="Resend Verification Email"
            variant="outline"
            onPress={handleResendVerification}
            loading={loading}
          />

          <Pressable
            onPress={() => setView('login')}
            style={[styles.linkCenter, { marginTop: Spacing.three }]}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Back to Sign In
            </Text>
          </Pressable>
        </View>
      )}

      {/* VIEW: FORGOT PASSWORD */}
      {view === 'forgot' && (
        <View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Enter your email address and we'll send you a password reset link with a token.
          </Text>
          <Input
            label="Email Address"
            placeholder="your-email@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button
            title="Send Reset Link"
            onPress={handleForgotPassword}
            loading={loading}
            style={{ marginTop: Spacing.two }}
          />

          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary }}>Remembered your password?</Text>
            <Pressable onPress={() => setView('login')}>
              <Text style={[styles.linkText, { color: colors.primary, fontWeight: '700' }]}>
                {' '}Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* VIEW: RESET PASSWORD */}
      {view === 'reset' && (
        <View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Enter the token from your reset email and your new password.
          </Text>
          <Input
            label="Reset Token"
            placeholder="Paste token from email"
            value={token}
            onChangeText={setToken}
          />
          <Input
            label="New Password"
            placeholder="••••••••"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <Button
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            style={{ marginTop: Spacing.two }}
          />

          <Pressable
            onPress={() => setView('login')}
            style={[styles.linkCenter, { marginTop: Spacing.three }]}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Back to Sign In
            </Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  linkRight: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.three,
  },
  linkCenter: {
    alignSelf: 'center',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    cursor: 'pointer' as any,
  },
  linkTextMuted: {
    fontSize: 12,
    textDecorationLine: 'underline',
    cursor: 'pointer' as any,
  },
  infoText: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: Spacing.three,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.four,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  secondaryActionRow: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  photoUploadContainer: {
    marginBottom: Spacing.three,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flex: 1,
  },
  photoHint: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 15,
  },
});
