import { api } from './api';

export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  profilePicture?: string | null;
  createdAt?: string;
  updatedAt?: string;
  prescriptionsCount: number;
  filesCount: number;
  remindersCount: number;
}

export interface AdminUserDetail extends AdminUserSummary {
  fcmToken?: string | null;
  profile?: {
    profileId?: number;
    phoneNumber?: string;
    bloodGroup?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    allergies?: string;
  } | null;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  adminUsers: number;
  regularUsers: number;
  totalPrescriptions: number;
  totalMedicines: number;
  totalFiles: number;
  totalReminders: number;
}

export interface AdminPrescriptionSummary {
  id: number;
  userId?: number;
  userEmail?: string;
  userName?: string;
  doctorName?: string;
  hospitalName?: string;
  prescriptionDate?: string;
  uploadDate?: string;
  medicinesCount: number;
}

export interface AdminFileSummary {
  id: number;
  userId?: number;
  userEmail?: string;
  userName?: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  cloudinaryUrl: string;
  createdAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface UserQueryParams {
  search?: string;
  role?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
}

export const adminService = {
  // Traverse users with optional filters & pagination
  async getAllUsers(params?: UserQueryParams): Promise<PageResponse<AdminUserSummary>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.enabled !== undefined) query.append('enabled', String(params.enabled));
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.size !== undefined) query.append('size', String(params.size));
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.direction) query.append('direction', params.direction);

    const qs = query.toString();
    const endpoint = `/admin/users${qs ? `?${qs}` : ''}`;
    return await api.get<PageResponse<AdminUserSummary>>(endpoint);
  },

  // Inspect single user details
  async getUserById(id: number): Promise<AdminUserDetail> {
    return await api.get<AdminUserDetail>(`/admin/users/${id}`);
  },

  // Create an Administrator account (System Administrator only)
  async createAdmin(data: { name: string; email: string; password: string }): Promise<AdminUserSummary> {
    return await api.post<AdminUserSummary>('/admin/create-admin', data);
  },

  // Update user info
  async updateUser(
    id: number,
    data: { name?: string; email?: string; role?: string; enabled?: boolean }
  ): Promise<AdminUserSummary> {
    return await api.put<AdminUserSummary>(`/admin/users/${id}`, data);
  },

  // Update user role (promote/demote)
  async updateUserRole(id: number, role: 'ROLE_ADMIN' | 'ROLE_USER'): Promise<AdminUserSummary> {
    return await api.patch<AdminUserSummary>(`/admin/users/${id}/role`, { role });
  },

  // Update user account status (enable/disable)
  async updateUserStatus(id: number, enabled: boolean): Promise<AdminUserSummary> {
    return await api.patch<AdminUserSummary>(`/admin/users/${id}/status`, { enabled });
  },

  // Delete user
  async deleteUser(id: number): Promise<string> {
    return await api.delete<string>(`/admin/users/${id}`);
  },

  // Global system statistics
  async getSystemStats(): Promise<SystemStats> {
    return await api.get<SystemStats>('/admin/stats');
  },

  // Traverse all prescriptions across all users
  async getAllPrescriptions(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'asc' | 'desc';
  }): Promise<PageResponse<AdminPrescriptionSummary>> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.size !== undefined) query.append('size', String(params.size));
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.direction) query.append('direction', params.direction);

    const qs = query.toString();
    const endpoint = `/admin/prescriptions${qs ? `?${qs}` : ''}`;
    return await api.get<PageResponse<AdminPrescriptionSummary>>(endpoint);
  },

  // Delete prescription
  async deletePrescription(id: number): Promise<string> {
    return await api.delete<string>(`/admin/prescriptions/${id}`);
  },

  // Traverse all files across all users
  async getAllFiles(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'asc' | 'desc';
  }): Promise<PageResponse<AdminFileSummary>> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.size !== undefined) query.append('size', String(params.size));
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.direction) query.append('direction', params.direction);

    const qs = query.toString();
    const endpoint = `/admin/files${qs ? `?${qs}` : ''}`;
    return await api.get<PageResponse<AdminFileSummary>>(endpoint);
  },

  // Delete file
  async deleteFile(id: number): Promise<string> {
    return await api.delete<string>(`/admin/files/${id}`);
  },
};
