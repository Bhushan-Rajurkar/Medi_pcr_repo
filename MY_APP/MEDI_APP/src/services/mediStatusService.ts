import { Platform } from 'react-native';
import { apiClient } from './api';

export interface LogMediStatusRequest {
  status: 'TAKEN' | 'SNOOZED' | 'DISMISSED' | 'POSTPONED' | 'OTHERS';
  medicineId?: number;
  reminderId?: number;
  medicineName?: string;
  slot?: string;
  scheduledTime?: string;
  notes?: string;
  reason?: string;
}

export interface BatchLogMediStatusRequest {
  status: 'TAKEN' | 'SNOOZED' | 'DISMISSED' | 'POSTPONED' | 'OTHERS';
  medicineIds?: number[];
  reminderIds?: number[];
  slot?: string;
  scheduledTime?: string;
  notes?: string;
  reason?: string;
}

export interface MediStatusLogItem {
  id: number;
  status: string;
  medicineName: string;
  slot?: string;
  scheduledTime?: string;
  logDate: string;
  actionTime: string;
  notes?: string;
  reason?: string;
}

export interface DailyAdherenceItem {
  date: string;
  taken: number;
  snoozed: number;
  dismissed: number;
  postponed: number;
  others: number;
  total: number;
}

export interface MediStatusReport {
  totalEvents: number;
  takenCount: number;
  snoozedCount: number;
  dismissedCount: number;
  postponedCount: number;
  othersCount: number;
  adherenceRate: number; // e.g. 88.5
  dailyBreakdown: DailyAdherenceItem[];
  recentLogs: MediStatusLogItem[];
}

export interface TabularLogItem {
  id: number;
  logDate: string;
  actionTime: string;
  medicineName: string;
  slot?: string;
  scheduledTime?: string;
  status: string; // TAKEN, SNOOZED, DISMISSED, POSTPONED, OTHERS
  reason?: string;
  notes?: string;
}

export interface TabularReport {
  days: number;
  categoryFilter?: string;
  totalLogs: number;
  logs: TabularLogItem[];
}

export function notifyMediStatusUpdated(detail?: any) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('MEDISTATUS_UPDATED', { detail }));
    } catch (e) {
      // ignore
    }
  }
}

class MediStatusService {
  /**
   * Records a medication status (TAKEN, SNOOZED, DISMISSED, POSTPONED, OTHERS) in the separate medi_status_logs table
   */
  public async logStatus(data: LogMediStatusRequest): Promise<MediStatusLogItem> {
    const res = await apiClient.post<MediStatusLogItem>('/medistatus/log', data);
    notifyMediStatusUpdated({ status: data.status, id: res.id });
    return res;
  }

  /**
   * Records medication status for multiple medicines in a single 1-click call
   */
  public async batchLogStatus(data: BatchLogMediStatusRequest): Promise<MediStatusLogItem[]> {
    const res = await apiClient.post<MediStatusLogItem[]>('/medistatus/batch-log', data);
    notifyMediStatusUpdated({ status: data.status, count: res.length });
    return res;
  }

  /**
   * Retrieves visual report analytics and adherence statistics for 7, 14, or 30 days
   * Uses cache-busting timestamp to guarantee fresh real-time database results
   */
  public async getReport(days: number = 7): Promise<MediStatusReport> {
    const timestamp = Date.now();
    return apiClient.get<MediStatusReport>(`/medistatus/report?days=${days}&_t=${timestamp}`);
  }

  /**
   * Retrieves chronological intake log history
   */
  public async getHistory(): Promise<MediStatusLogItem[]> {
    const timestamp = Date.now();
    return apiClient.get<MediStatusLogItem[]>(`/medistatus/history?_t=${timestamp}`);
  }

  /**
   * Retrieves individual user's tabular report covering all 5 categories with reasons
   * Uses cache-busting timestamp to guarantee fresh real-time database results
   */
  public async getTabularReport(days: number = 30, category?: string): Promise<TabularReport> {
    const timestamp = Date.now();
    let url = `/medistatus/tabular-report?days=${days}&_t=${timestamp}`;
    if (category && category !== 'ALL') {
      url += `&category=${encodeURIComponent(category)}`;
    }
    return apiClient.get<TabularReport>(url);
  }
}

export const mediStatusService = new MediStatusService();

