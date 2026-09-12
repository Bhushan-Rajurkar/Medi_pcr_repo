import { api } from './api';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role?: string;
  profilePicture?: string | null;
  enabled: boolean;
  fcmToken?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  email: string;
  name: string;
  role?: string;
  profilePicture?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  profilePicture?: string;
}

export const authService = {
  // Register with JSON
  async register(data: RegisterRequest): Promise<string> {
    const res = await api.post<string>('/auth/register', data);
    return res;
  },

  // Register with Multipart (e.g. file upload)
  async registerMultipart(formData: FormData): Promise<string> {
    const res = await api.postMultipart<string>('/auth/register', formData);
    return res;
  },

  // Login
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    if (res && res.token) {
      api.setToken(res.token);
    }
    return res;
  },

  // Verify account via token
  async verifyAccount(token: string): Promise<string> {
    const res = await api.get<string>(`/auth/verify?token=${encodeURIComponent(token)}`);
    return res;
  },

  // Resend verification email
  async resendVerification(email: string): Promise<string> {
    const res = await api.post<string>('/auth/resend-verification', { email });
    return res;
  },

  // Forgot password request
  async forgotPassword(email: string): Promise<string> {
    const res = await api.post<string>('/auth/forgot-password', { email });
    return res;
  },

  // Validate reset token
  async validateResetToken(token: string): Promise<string> {
    const res = await api.get<string>(`/auth/reset-password?token=${encodeURIComponent(token)}`);
    return res;
  },

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<string> {
    const res = await api.post<string>('/auth/reset-password', { token, newPassword });
    return res;
  },

  // Get current user profile
  async getProfile(): Promise<UserProfile> {
    const res = await api.get<UserProfile>('/auth/me');
    return res;
  },

  // Update profile with JSON
  async updateProfile(name?: string, profilePicture?: string): Promise<UserProfile> {
    const res = await api.put<UserProfile>('/auth/profile', { name, profilePicture });
    return res;
  },

  // Update profile with Multipart (e.g. file upload)
  async updateProfileMultipart(formData: FormData): Promise<UserProfile> {
    const res = await api.putMultipart<UserProfile>('/auth/profile', formData);
    return res;
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    const res = await api.post<string>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res;
  },

  // Clear session
  logout(): void {
    api.setToken(null);
  },
};
