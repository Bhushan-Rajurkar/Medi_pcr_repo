import { api } from './api';

export interface MedicalFile {
  id: number;
  fileName: string;
  originalFileName: string;
  fileType: string;
  resourceType: string;
  url: string;
  publicId: string;
  size: number;
  uploadedAt: string;
}

export const fileService = {
  // Upload a medical report/file
  async uploadFile(file: File | Blob, fileName?: string): Promise<MedicalFile> {
    const formData = new FormData();
    formData.append('file', file as any);
    if (fileName && fileName.trim()) {
      formData.append('fileName', fileName.trim());
    }

    const res = await api.postMultipart<MedicalFile>('/files/upload', formData);
    return res;
  },

  // Get all files for the authenticated user
  async getMyFiles(): Promise<MedicalFile[]> {
    const res = await api.get<MedicalFile[]>('/files');
    return Array.isArray(res) ? res : [];
  },

  // Get details of a single file
  async getFile(id: number): Promise<MedicalFile> {
    const res = await api.get<MedicalFile>(`/files/${id}`);
    return res;
  },

  // Search files by keyword
  async searchFiles(keyword: string): Promise<MedicalFile[]> {
    const res = await api.get<MedicalFile[]>(`/files/search?keyword=${encodeURIComponent(keyword)}`);
    return Array.isArray(res) ? res : [];
  },

  // Delete file
  async deleteFile(id: number): Promise<void> {
    await api.delete<void>(`/files/${id}`);
  },

  // Get direct download URL
  getDownloadUrl(id: number): string {
    return `${api.getBaseUrl()}/files/download/${id}`;
  },
};
