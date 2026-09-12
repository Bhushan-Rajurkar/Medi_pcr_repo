import { api } from './api';
import { MedicineResponse } from './prescriptionService';

export interface ManualMedicineFormData {
  medicineName: string;
  prescriptionId?: number;
  frequency?: string;
  mediStatus?: string;
  status?: string;
  foodInstruction?: string;
  totalQuantity?: number;
  startDate?: string;
  endDate?: string;

  morning: boolean;
  morningTime?: string | null;

  afternoon: boolean;
  afternoonTime?: string | null;

  evening: boolean;
  eveningTime?: string | null;

  night: boolean;
  nightTime?: string | null;
}

export const medicineService = {
  /**
   * Add a new medicine manually with customized timings.
   */
  async addMedicine(data: ManualMedicineFormData): Promise<MedicineResponse> {
    return await api.post<MedicineResponse>('/medicines', data);
  },

  /**
   * Update an existing medicine's timings, dosage, or details.
   */
  async updateMedicine(id: number, data: ManualMedicineFormData): Promise<MedicineResponse> {
    return await api.put<MedicineResponse>(`/medicines/${id}`, data);
  },

  /**
   * Delete a medicine.
   */
  async deleteMedicine(id: number): Promise<void> {
    await api.delete<void>(`/medicines/${id}`);
  },

  /**
   * Quick status change (ACTIVE, COMPLETED, STOPPED).
   */
  async updateStatus(id: number, status: string): Promise<MedicineResponse> {
    return await api.patch<MedicineResponse>(`/medicines/${id}/status`, { status });
  },

  /**
   * Get all user medicines with optional status filter.
   */
  async getMedicines(status?: string): Promise<MedicineResponse[]> {
    const url = status && status !== 'ALL' ? `/medicines?status=${encodeURIComponent(status)}` : '/medicines';
    return await api.get<MedicineResponse[]>(url);
  },

  /**
   * Get medicine by ID.
   */
  async getMedicineById(id: number): Promise<MedicineResponse> {
    return await api.get<MedicineResponse>(`/medicines/${id}`);
  },
};
