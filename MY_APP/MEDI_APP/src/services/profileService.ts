import { api } from './api';

export interface EmergencyProfile {
  id?: number;
  userId?: number;
  name?: string;
  email?: string;
  profilePicture?: string;

  // Mandatory details
  contactNumber: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  guardianAddress: string;
  doctorName: string;
  doctorContact: string;

  // Optional health details
  bloodPressure?: string;
  heartRate?: string;
  weight?: number;
  age?: number;
  height?: number;
  bloodGroup?: string;
  allergies: string[];

  // QR Code & Links
  qrCodeToken?: string;
  qrCodeDataUrl?: string;
  publicProfileUrl?: string;
  emergencyViewUrl?: string;
  isComplete?: boolean;
  complete?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileFormData {
  name?: string;
  profilePicture?: string;
  contactNumber: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  guardianAddress: string;
  doctorName: string;
  doctorContact: string;
  bloodPressure?: string;
  heartRate?: string;
  weight?: number;
  age?: number;
  height?: number;
  bloodGroup?: string;
  allergies: string[];
}

export interface PublicEmergencyProfile {
  name: string;
  email?: string;
  profilePicture?: string;
  contactNumber: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  guardianAddress: string;
  doctorName: string;
  doctorContact: string;
  bloodGroup?: string;
  allergies: string[];
  bloodPressure?: string;
  heartRate?: string;
  weight?: number;
  age?: number;
  height?: number;
  lastUpdated?: string;
}

export const profileService = {
  /**
   * Fetch current user's profile and emergency QR code.
   */
  async getMyProfile(): Promise<EmergencyProfile> {
    return await api.get<EmergencyProfile>('/profile/me');
  },

  /**
   * Save or update profile with mandatory and optional health details.
   */
  async saveProfile(data: ProfileFormData): Promise<EmergencyProfile> {
    return await api.post<EmergencyProfile>('/profile/save', data);
  },

  /**
   * Regenerate unique QR code token and image.
   */
  async regenerateQr(): Promise<EmergencyProfile> {
    return await api.post<EmergencyProfile>('/profile/regenerate-qr', {});
  },

  /**
   * Fetch public emergency profile (no authentication required).
   */
  async getPublicEmergencyProfile(qrCodeToken: string): Promise<PublicEmergencyProfile> {
    return await api.get<PublicEmergencyProfile>(`/profile/public/${qrCodeToken}`);
  },

  /**
   * Get direct URL to the interactive web emergency card.
   */
  getEmergencyViewUrl(qrCodeToken: string): string {
    const base = api.getBaseUrl().replace(/\/+$/, '');
    return `${base}/profile/emergency/${qrCodeToken}/view`;
  },

  /**
   * Get direct URL to the QR code PNG image.
   */
  getQrImageUrl(qrCodeToken: string): string {
    const base = api.getBaseUrl().replace(/\/+$/, '');
    return `${base}/profile/public/${qrCodeToken}/qr-image`;
  },
};
