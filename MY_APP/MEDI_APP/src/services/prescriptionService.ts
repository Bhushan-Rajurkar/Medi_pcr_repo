import { api } from './api';

export interface DoctorResponse {
  id?: number;
  clinicName: string;
  doctorNames: string;
  address?: string;
  contactNumber?: string;
}

export interface PatientResponse {
  id?: number;
  name: string;
  age?: string;
  gender?: string;
  allergies?: string;
  bp?: string;
  heartRate?: string;
  weight?: string;
}

export interface ReminderResponse {
  id: number;
  medicineId: number;
  medicineName: string;
  slot: string;
  reminderTime: string;
  foodInstruction?: string;
  mediStatus?: string;
}

export interface MedicineResponse {
  id: number;
  prescriptionId?: number;
  medicineName: string;
  status: string;
  mediStatus?: string;
  morningStatus?: string;
  afternoonStatus?: string;
  eveningStatus?: string;
  nightStatus?: string;
  frequency?: string;
  morning: boolean;
  morningTime?: string | null;
  afternoon: boolean;
  afternoonTime?: string | null;
  evening: boolean;
  eveningTime?: string | null;
  night: boolean;
  nightTime?: string | null;
  foodInstruction?: string;
  totalQuantity?: number;
  startDate?: string;
  endDate?: string;
  reminders?: ReminderResponse[];
}

export interface PrescriptionResponse {
  id: number;
  externalPrescriptionId?: string;
  uploadDate?: string;
  prescriptionDate?: string;
  doctor?: DoctorResponse;
  patient?: PatientResponse;
  medicines: MedicineResponse[];
}

export const prescriptionService = {
  // Save extracted prescription payload to backend database
  async savePrescription(payload: any): Promise<PrescriptionResponse> {
    const res = await api.post<PrescriptionResponse>('/prescriptions', payload);
    return res;
  },

  // Get all prescriptions for current user
  async getMyPrescriptions(): Promise<PrescriptionResponse[]> {
    const res = await api.get<PrescriptionResponse[]>('/prescriptions');
    return Array.isArray(res) ? res : [];
  },

  // Get single prescription
  async getPrescription(id: number): Promise<PrescriptionResponse> {
    const res = await api.get<PrescriptionResponse>(`/prescriptions/${id}`);
    return res;
  },

  // Delete prescription
  async deletePrescription(id: number): Promise<void> {
    await api.delete<void>(`/prescriptions/${id}`);
  },

  // Get medicines with optional status filter (ACTIVE, COMPLETED, STOPPED)
  async getUserMedicines(status?: string): Promise<MedicineResponse[]> {
    const path = status ? `/prescriptions/medicines?status=${encodeURIComponent(status)}` : '/prescriptions/medicines';
    const res = await api.get<MedicineResponse[]>(path);
    return Array.isArray(res) ? res : [];
  },

  // Update medicine status
  async updateMedicineStatus(medicineId: number, status: string): Promise<MedicineResponse> {
    const res = await api.patch<MedicineResponse>(`/prescriptions/medicines/${medicineId}/status`, { status });
    return res;
  },

  // Get today's scheduled reminders
  async getTodayReminders(): Promise<ReminderResponse[]> {
    const res = await api.get<ReminderResponse[]>('/prescriptions/reminders/today');
    return Array.isArray(res) ? res : [];
  },
};
