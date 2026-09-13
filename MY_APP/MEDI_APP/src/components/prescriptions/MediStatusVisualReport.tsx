import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import {
  mediStatusService,
  MediStatusReport,
  DailyAdherenceItem,
  TabularLogItem,
} from '@/services/mediStatusService';
import { Toast, ToastMessage } from '@/components/common/Toast';
import {
  CheckIcon,
  ClockIcon,
  CloseIcon,
  RefreshIcon,
  HeartPulseIcon,
  PillIcon,
  DownloadIcon,
  FileTextIcon,
} from '@/components/common/Icons';

interface MediStatusVisualReportProps {
  onRefreshParent?: () => void;
}

export const MediStatusVisualReport: React.FC<MediStatusVisualReportProps> = () => {
  const { colors, isDark } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'visual' | 'tabular'>('visual');
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [logging, setLogging] = useState<boolean>(false);
  const [report, setReport] = useState<MediStatusReport | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyAdherenceItem | null>(null);

  // Tabular Report State
  const [tabularDays, setTabularDays] = useState<number>(30);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [tabularLogs, setTabularLogs] = useState<TabularLogItem[]>([]);
  const [tabularLoading, setTabularLoading] = useState<boolean>(false);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  const loadReport = async (rangeDays: number = days, isSilent: boolean = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setIsSyncing(true);
    }
    setToast(null);
    try {
      const data = await mediStatusService.getReport(rangeDays);
      setReport(data);
      setLastSynced(new Date());
      if (data.dailyBreakdown && data.dailyBreakdown.length > 0) {
        setSelectedDay((prev) => {
          if (!prev) return data.dailyBreakdown[data.dailyBreakdown.length - 1];
          const matched = data.dailyBreakdown.find((d) => d.date === prev.date);
          return matched || data.dailyBreakdown[data.dailyBreakdown.length - 1];
        });
      }
    } catch (err: any) {
      if (!isSilent) {
        setToast({
          id: 'rep_err',
          type: 'error',
          message: err.message || 'Failed to load adherence report',
        });
      }
    } finally {
      if (!isSilent) setLoading(false);
      setIsSyncing(false);
    }
  };

  const loadTabularReport = async (rangeDays: number = tabularDays, cat: string = categoryFilter, isSilent: boolean = false) => {
    if (!isSilent) setTabularLoading(true);
    try {
      const res = await mediStatusService.getTabularReport(rangeDays, cat);
      setTabularLogs(res.logs || []);
      setLastSynced(new Date());
    } catch (err: any) {
      if (!isSilent) {
        setToast({
          id: 'tab_err',
          type: 'error',
          message: err.message || 'Failed to load tabular report',
        });
      }
    } finally {
      if (!isSilent) setTabularLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial full fetch
    loadReport(days, false);
    if (activeTab === 'tabular') {
      loadTabularReport(tabularDays, categoryFilter, false);
    }

    // 2. Real-time auto-refresh interval: polls database every 10 seconds silently
    const interval = setInterval(() => {
      loadReport(days, true);
      loadTabularReport(tabularDays, categoryFilter, true);
    }, 10000);

    // 3. Listen for window MEDISTATUS_UPDATED events (e.g. from ReasonFormModal or in-app actions)
    const handleStatusUpdate = () => {
      loadReport(days, true);
      loadTabularReport(tabularDays, categoryFilter, true);
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('MEDISTATUS_UPDATED', handleStatusUpdate);
      window.addEventListener('focus', handleStatusUpdate);
    }

    // 4. Listen for Service Worker messages (device notification 1-click actions)
    let handleSwMessage: any = null;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.serviceWorker) {
      handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'MEDISTATUS_UPDATED' || event.data?.type === 'STOP_ALARM') {
          loadReport(days, true);
          loadTabularReport(tabularDays, categoryFilter, true);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // 5. Visibility change (when user returns to tab after checking phone or notification)
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadReport(days, true);
        loadTabularReport(tabularDays, categoryFilter, true);
      }
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('MEDISTATUS_UPDATED', handleStatusUpdate);
        window.removeEventListener('focus', handleStatusUpdate);
      }
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.serviceWorker && handleSwMessage) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [days, activeTab, tabularDays, categoryFilter]);

  // Quick action logger to test or log doses directly from report view
  const handleQuickLog = async (status: 'TAKEN' | 'SNOOZED' | 'DISMISSED' | 'POSTPONED' | 'OTHERS', customReason?: string) => {
    setLogging(true);
    try {
      await mediStatusService.logStatus({
        status,
        medicineName: 'Daily Medication',
        slot: 'MORNING',
        reason: customReason || (status === 'OTHERS' ? 'Side effects / nausea' : undefined),
        notes: `Logged via MediStatus Dashboard (${status})`,
      });
      setToast({
        id: 'log_ok',
        type: 'success',
        message: `Status "${status}" recorded successfully!`,
      });
      await loadReport(days);
      if (activeTab === 'tabular') {
        await loadTabularReport(tabularDays, categoryFilter);
      }
    } catch (err: any) {
      setToast({
        id: 'log_err',
        type: 'error',
        message: err.message || 'Failed to record status',
      });
    } finally {
      setLogging(false);
    }
  };

  // CSV Export for Tabular Report
  const handleExportCSV = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setToast({ id: 'csv_err', type: 'info', message: 'CSV download is supported in web browser mode.' });
      return;
    }

    if (!tabularLogs || tabularLogs.length === 0) {
      setToast({ id: 'csv_empty', type: 'warning', message: 'No records available to export for this filter.' });
      return;
    }

    const headers = ['Date', 'Time', 'Medicine Name', 'Scheduled Slot', 'Scheduled Time', 'Status Category', 'Reason / Notes'];
    const rows = tabularLogs.map((item) => [
      `"${item.logDate || ''}"`,
      `"${item.actionTime ? item.actionTime.replace('T', ' ').slice(11, 19) : ''}"`,
      `"${(item.medicineName || '').replace(/"/g, '""')}"`,
      `"${(item.slot || 'N/A').replace(/"/g, '""')}"`,
      `"${(item.scheduledTime || '').replace(/"/g, '""')}"`,
      `"${item.status || ''}"`,
      `"${(item.reason || item.notes || '—').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Medi_PCR_Report_${categoryFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({ id: 'csv_ok', type: 'success', message: 'Tabular CSV report downloaded successfully!' });
  };

  // PDF / Print Export for Tabular Report
  const handleExportTabularPDF = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setToast({ id: 'pdf_err', type: 'info', message: 'PDF printing is supported in web browser mode.' });
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const tableRowsHtml = tabularLogs.map((log) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #E2E8F0; font-size: 11px;">${log.logDate || ''}</td>
        <td style="padding: 8px; border: 1px solid #E2E8F0; font-size: 11px;">${log.actionTime ? log.actionTime.replace('T', ' ').slice(11, 16) : ''}</td>
        <td style="padding: 8px; border: 1px solid #E2E8F0; font-weight: 600; font-size: 11px;">${log.medicineName || 'Medication'}</td>
        <td style="padding: 8px; border: 1px solid #E2E8F0; font-size: 11px;">${log.slot || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #E2E8F0; font-size: 11px;">
          <span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 10px;
            background: ${
              log.status === 'TAKEN' ? '#DCFCE7; color: #16A34A' :
              log.status === 'SNOOZED' ? '#FEF3C7; color: #D97706' :
              log.status === 'POSTPONED' ? '#DBEAFE; color: #2563EB' :
              log.status === 'OTHERS' ? '#EDE9FE; color: #7C3AED' : '#FEE2E2; color: #DC2626'
            };">
            ${log.status}
          </span>
        </td>
        <td style="padding: 8px; border: 1px solid #E2E8F0; font-size: 11px; color: #475569;">${log.reason || log.notes || '—'}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medi_PCR Tabular Adherence Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1E293B; }
            h1 { margin-bottom: 4px; font-size: 20px; }
            p { margin-top: 0; color: #64748B; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #F1F5F9; padding: 10px 8px; border: 1px solid #CBD5E1; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0EA5E9; padding-bottom: 12px;">
            <div>
              <h1>Medi_PCR Patient Medication Report</h1>
              <p>Filter: <strong>${categoryFilter}</strong> | Range: <strong>Last ${tabularDays} Days</strong> | Total Logs: <strong>${tabularLogs.length}</strong></p>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background: #0EA5E9; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Save as PDF / Print</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Medicine Name</th>
                <th>Slot</th>
                <th>Category</th>
                <th>Reason / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // PDF / Print Export for Visual Report
  const handleExportVisualPDF = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setToast({ id: 'pdf_err', type: 'info', message: 'PDF printing is supported in web browser mode.' });
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medi_PCR Visual Adherence Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #0F172A; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0EA5E9; padding-bottom: 12px; margin-bottom: 20px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi-card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; background: #F8FAFC; }
            .kpi-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 4px; }
            .kpi-val { font-size: 24px; font-weight: 900; }
            .breakdown-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .breakdown-table th { background: #F1F5F9; padding: 8px; border: 1px solid #CBD5E1; text-align: left; font-size: 11px; }
            .breakdown-table td { padding: 8px; border: 1px solid #E2E8F0; font-size: 11px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Medi_PCR Visual Adherence Summary</h1>
              <p style="margin: 0; color: #64748B; font-size: 12px;">Analytics Period: Last ${days} Days | Adherence Rate: <strong>${report?.adherenceRate || 0}%</strong></p>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background: #0EA5E9; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Save as PDF / Print</button>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card" style="border-left: 4px solid #16A34A;">
              <div class="kpi-title">Taken</div>
              <div class="kpi-val" style="color: #16A34A;">${report?.takenCount || 0}</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #D97706;">
              <div class="kpi-title">Snoozed</div>
              <div class="kpi-val" style="color: #D97706;">${report?.snoozedCount || 0}</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #2563EB;">
              <div class="kpi-title">Postponed</div>
              <div class="kpi-val" style="color: #2563EB;">${report?.postponedCount || 0}</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #7C3AED;">
              <div class="kpi-title">Others</div>
              <div class="kpi-val" style="color: #7C3AED;">${report?.othersCount || 0}</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #DC2626;">
              <div class="kpi-title">Dismissed</div>
              <div class="kpi-val" style="color: #DC2626;">${report?.dismissedCount || 0}</div>
            </div>
          </div>

          <h3 style="font-size: 14px; margin-bottom: 8px;">Daily Adherence Log Breakdown</h3>
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Taken</th>
                <th>Snoozed</th>
                <th>Postponed</th>
                <th>Others</th>
                <th>Dismissed</th>
                <th>Total Scheduled</th>
              </tr>
            </thead>
            <tbody>
              ${(report?.dailyBreakdown || []).map((d) => `
                <tr>
                  <td><strong>${d.date}</strong></td>
                  <td style="color: #16A34A;">${d.taken}</td>
                  <td style="color: #D97706;">${d.snoozed}</td>
                  <td style="color: #2563EB;">${d.postponed}</td>
                  <td style="color: #7C3AED;">${d.others}</td>
                  <td style="color: #DC2626;">${d.dismissed}</td>
                  <td><strong>${d.total}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const total = report?.totalEvents || 0;
  const taken = report?.takenCount || 0;
  const snoozed = report?.snoozedCount || 0;
  const dismissed = report?.dismissedCount || 0;
  const postponed = report?.postponedCount || 0;
  const others = report?.othersCount || 0;
  const rate = report?.adherenceRate || 0;

  const maxDayTotal = Math.max(
    ...(report?.dailyBreakdown?.map((d) => d.total) || [1]),
    1
  );

  return (
    <View style={styles.container}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Main Mode Sub-Tab Switcher */}
      <View style={[styles.mainTabNav, { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC' }]}>
        <Pressable
          onPress={() => setActiveTab('visual')}
          style={[
            styles.tabBtn,
            activeTab === 'visual' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
          ]}>
          <HeartPulseIcon size={16} color={activeTab === 'visual' ? '#FFFFFF' : colors.textSecondary} />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'visual' ? '#FFFFFF' : colors.textSecondary },
              activeTab === 'visual' && { fontWeight: '800' },
            ]}>
            Visual Adherence Charts
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('tabular')}
          style={[
            styles.tabBtn,
            activeTab === 'tabular' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
          ]}>
          <FileTextIcon size={16} color={activeTab === 'tabular' ? '#FFFFFF' : colors.textSecondary} />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'tabular' ? '#FFFFFF' : colors.textSecondary },
              activeTab === 'tabular' && { fontWeight: '800' },
            ]}>
            Detailed Tabular Report (5 Categories & Reasons)
          </Text>
        </Pressable>
      </View>

      {/* ========================================================
          TAB 1: VISUAL REPORT & COMPLIANCE CHARTS
      ======================================================== */}
      {activeTab === 'visual' && (
        <>
          {/* Header & Range Filters */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Medication Adherence & MediStatus Analytics
                </Text>
                <View
                  style={[
                    styles.liveSyncBadge,
                    {
                      backgroundColor: isSyncing ? (isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7') : (isDark ? 'rgba(22,163,74,0.2)' : '#DCFCE7'),
                      borderColor: isSyncing ? '#F59E0B' : '#16A34A',
                    },
                  ]}>
                  <View style={[styles.liveDot, { backgroundColor: isSyncing ? '#F59E0B' : '#16A34A' }]} />
                  <Text style={[styles.liveSyncText, { color: isSyncing ? '#B45309' : '#16A34A' }]}>
                    {isSyncing ? 'Syncing DB...' : `Live DB Sync • ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Visual charts covering Taken, Snoozed, Postponed, Dismissed, and Others (auto-refreshes with database).
              </Text>
            </View>

            <View style={styles.filterRow}>
              {[7, 14, 30].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDays(d)}
                  style={[
                    styles.rangePill,
                    {
                      backgroundColor: days === d ? colors.primary : isDark ? colors.surfaceHighlight : '#F1F5F9',
                      borderColor: days === d ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.rangePillText,
                      { color: days === d ? '#FFFFFF' : colors.text },
                    ]}>
                    {d} Days
                  </Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => loadReport(days, false)}
                style={[
                  styles.refreshBtnExpanded,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : '#EFF6FF',
                    borderColor: colors.primary,
                  },
                ]}>
                <RefreshIcon size={14} color={colors.primary} />
                <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
                  {isSyncing ? 'Syncing...' : 'Refresh DB'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleExportVisualPDF}
                style={[styles.downloadReportBtn, { backgroundColor: colors.primary }]}>
                <DownloadIcon size={14} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>PDF / Print</Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Analyzing MediStatus adherence data...
              </Text>
            </View>
          ) : (
            <>
              {/* Adherence Score Card */}
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.heroLeft}>
                  <View
                    style={[
                      styles.scoreRing,
                      {
                        borderColor: rate >= 80 ? colors.success : rate >= 50 ? colors.warning : colors.danger,
                        backgroundColor: isDark ? colors.surfaceHighlight : colors.primaryLight,
                      },
                    ]}>
                    <Text style={[styles.scoreNumber, { color: colors.text }]}>
                      {rate}%
                    </Text>
                    <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                      Adherence
                    </Text>
                  </View>
                </View>

                <View style={styles.heroRight}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: rate >= 80 ? colors.successBg : rate >= 50 ? '#FEF3C7' : '#FEE2E2',
                          borderColor: rate >= 80 ? colors.success : rate >= 50 ? colors.warning : colors.danger,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: rate >= 80 ? colors.success : rate >= 50 ? '#B45309' : colors.danger },
                        ]}>
                        {rate >= 80 ? '✓ Excellent Compliance' : rate >= 50 ? '⚠️ Moderate Compliance' : '🚨 Needs Improvement'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.heroSummary, { color: colors.text }]}>
                    {total > 0
                      ? `You have taken ${taken} of ${total} total scheduled doses in the last ${days} days.`
                      : 'No medication events recorded yet for this period. Respond to device notifications to track adherence!'}
                  </Text>

                  {/* Quick Log Test Buttons */}
                  <View style={styles.quickLogRow}>
                    <Text style={[styles.quickLogLabel, { color: colors.textSecondary }]}>
                      Quick Record Status:
                    </Text>
                    <View style={styles.quickBtns}>
                      <Pressable
                        disabled={logging}
                        onPress={() => handleQuickLog('TAKEN')}
                        style={[styles.miniBtn, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                        <Text style={[styles.miniBtnText, { color: colors.success }]}>+ Taken</Text>
                      </Pressable>
                      <Pressable
                        disabled={logging}
                        onPress={() => handleQuickLog('SNOOZED')}
                        style={[styles.miniBtn, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                        <Text style={[styles.miniBtnText, { color: '#B45309' }]}>+ Snooze</Text>
                      </Pressable>
                      <Pressable
                        disabled={logging}
                        onPress={() => handleQuickLog('POSTPONED')}
                        style={[styles.miniBtn, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                        <Text style={[styles.miniBtnText, { color: '#1D4ED8' }]}>+ Postpone</Text>
                      </Pressable>
                      <Pressable
                        disabled={logging}
                        onPress={() => handleQuickLog('OTHERS', 'Experiencing nausea / dizziness')}
                        style={[styles.miniBtn, { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' }]}>
                        <Text style={[styles.miniBtnText, { color: '#7C3AED' }]}>+ Others</Text>
                      </Pressable>
                      <Pressable
                        disabled={logging}
                        onPress={() => handleQuickLog('DISMISSED')}
                        style={[styles.miniBtn, { backgroundColor: '#FEE2E2', borderColor: colors.danger }]}>
                        <Text style={[styles.miniBtnText, { color: colors.danger }]}>+ Dismiss</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* 5 MediStatus KPI Cards */}
              <View style={styles.kpiRow}>
                {/* 1. Taken */}
                <View
                  style={[
                    styles.kpiCard,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                      borderColor: colors.border,
                      borderLeftColor: colors.success,
                      borderLeftWidth: 4,
                    },
                  ]}>
                  <View style={styles.kpiHeader}>
                    <CheckIcon size={16} color={colors.success} />
                    <Text style={[styles.kpiTitle, { color: colors.textSecondary }]}>Taken</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{taken}</Text>
                  <Text style={[styles.kpiPercent, { color: colors.success }]}>
                    {total > 0 ? Math.round((taken / total) * 100) : 0}% of doses
                  </Text>
                </View>

                {/* 2. Snoozed */}
                <View
                  style={[
                    styles.kpiCard,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                      borderColor: colors.border,
                      borderLeftColor: '#F59E0B',
                      borderLeftWidth: 4,
                    },
                  ]}>
                  <View style={styles.kpiHeader}>
                    <ClockIcon size={16} color="#F59E0B" />
                    <Text style={[styles.kpiTitle, { color: colors.textSecondary }]}>Snoozed</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{snoozed}</Text>
                  <Text style={[styles.kpiPercent, { color: '#B45309' }]}>
                    {total > 0 ? Math.round((snoozed / total) * 100) : 0}% delayed
                  </Text>
                </View>

                {/* 3. Postponed */}
                <View
                  style={[
                    styles.kpiCard,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                      borderColor: colors.border,
                      borderLeftColor: '#3B82F6',
                      borderLeftWidth: 4,
                    },
                  ]}>
                  <View style={styles.kpiHeader}>
                    <ClockIcon size={16} color="#3B82F6" />
                    <Text style={[styles.kpiTitle, { color: colors.textSecondary }]}>Postponed</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{postponed}</Text>
                  <Text style={[styles.kpiPercent, { color: '#1D4ED8' }]}>
                    {total > 0 ? Math.round((postponed / total) * 100) : 0}% rescheduled
                  </Text>
                </View>

                {/* 4. Others */}
                <View
                  style={[
                    styles.kpiCard,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                      borderColor: colors.border,
                      borderLeftColor: '#8B5CF6',
                      borderLeftWidth: 4,
                    },
                  ]}>
                  <View style={styles.kpiHeader}>
                    <FileTextIcon size={16} color="#8B5CF6" />
                    <Text style={[styles.kpiTitle, { color: colors.textSecondary }]}>Others</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{others}</Text>
                  <Text style={[styles.kpiPercent, { color: '#7C3AED' }]}>
                    {total > 0 ? Math.round((others / total) * 100) : 0}% reasons logged
                  </Text>
                </View>

                {/* 5. Dismissed */}
                <View
                  style={[
                    styles.kpiCard,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                      borderColor: colors.border,
                      borderLeftColor: colors.danger,
                      borderLeftWidth: 4,
                    },
                  ]}>
                  <View style={styles.kpiHeader}>
                    <CloseIcon size={16} color={colors.danger} />
                    <Text style={[styles.kpiTitle, { color: colors.textSecondary }]}>Dismissed</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{dismissed}</Text>
                  <Text style={[styles.kpiPercent, { color: colors.danger }]}>
                    {total > 0 ? Math.round((dismissed / total) * 100) : 0}% skipped
                  </Text>
                </View>
              </View>

              {/* Visual Daily Stacked Bar Chart */}
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.chartHeader}>
                  <View>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>
                      Daily Medication Activity Breakdown
                    </Text>
                    <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
                      Reasons are unified under Others in the visual chart. Tap any day column to view its detailed intake breakdown.
                    </Text>
                  </View>

                  {/* 5-Category Legend */}
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>Taken</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>Snoozed</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>Postponed</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>Others</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>Dismissed</Text>
                    </View>
                  </View>
                </View>

                {/* Bars Container */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.barsContainer}>
                    {report?.dailyBreakdown?.map((day) => {
                      const isDaySelected = selectedDay?.date === day.date;
                      const barHeight = Math.max(
                        (day.total / maxDayTotal) * 130,
                        day.total > 0 ? 18 : 6
                      );

                      return (
                        <Pressable
                          key={day.date}
                          onPress={() => setSelectedDay(day)}
                          style={[
                            styles.barColumn,
                            isDaySelected && {
                              backgroundColor: isDark ? colors.surfaceHighlight : '#F1F5F9',
                              borderRadius: BorderRadius.md,
                            },
                          ]}>
                          {/* Bar Stack */}
                          <View style={[styles.barTrack, { height: 140 }]}>
                            {day.total === 0 ? (
                              <View style={[styles.emptyBarSegment, { backgroundColor: colors.border }]} />
                            ) : (
                              <View style={[styles.barStack, { height: barHeight }]}>
                                {day.taken > 0 && (
                                  <View
                                    style={{
                                      flex: day.taken,
                                      backgroundColor: colors.success,
                                    }}
                                  />
                                )}
                                {day.snoozed > 0 && (
                                  <View
                                    style={{
                                      flex: day.snoozed,
                                      backgroundColor: '#F59E0B',
                                    }}
                                  />
                                )}
                                {day.postponed > 0 && (
                                  <View
                                    style={{
                                      flex: day.postponed,
                                      backgroundColor: '#3B82F6',
                                    }}
                                  />
                                )}
                                {day.others > 0 && (
                                  <View
                                    style={{
                                      flex: day.others,
                                      backgroundColor: '#8B5CF6',
                                    }}
                                  />
                                )}
                                {day.dismissed > 0 && (
                                  <View
                                    style={{
                                      flex: day.dismissed,
                                      backgroundColor: colors.danger,
                                    }}
                                  />
                                )}
                              </View>
                            )}
                          </View>

                          {/* Date Label */}
                          <Text
                            style={[
                              styles.barDateText,
                              { color: isDaySelected ? colors.primary : colors.textMuted },
                              isDaySelected && { fontWeight: '800' },
                            ]}>
                            {day.date.slice(5)}
                          </Text>
                          <Text style={[styles.barTotalText, { color: colors.textSecondary }]}>
                            {day.total > 0 ? day.total : '—'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Selected Day Inspector */}
                {selectedDay && (
                  <View
                    style={[
                      styles.dayInspector,
                      {
                        backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC',
                        borderColor: colors.border,
                      },
                    ]}>
                    <Text style={[styles.inspectorDate, { color: colors.text }]}>
                      📅 Details for {selectedDay.date}:
                    </Text>
                    <View style={styles.inspectorStats}>
                      <Text style={{ color: colors.success, fontWeight: '700' }}>
                        ✓ Taken: {selectedDay.taken}
                      </Text>
                      <Text style={{ color: '#B45309', fontWeight: '700' }}>
                        ⏰ Snoozed: {selectedDay.snoozed}
                      </Text>
                      <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>
                        ⏳ Postponed: {selectedDay.postponed}
                      </Text>
                      <Text style={{ color: '#7C3AED', fontWeight: '700' }}>
                        📝 Others: {selectedDay.others}
                      </Text>
                      <Text style={{ color: colors.danger, fontWeight: '700' }}>
                        ✕ Dismissed: {selectedDay.dismissed}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Recent MediStatus Logs Timeline */}
              <View
                style={[
                  styles.timelineCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.timelineHeader}>
                  <HeartPulseIcon size={18} color={colors.primary} />
                  <Text style={[styles.timelineTitle, { color: colors.text }]}>
                    Recent MediStatus Activity Log
                  </Text>
                </View>

                {report?.recentLogs && report.recentLogs.length > 0 ? (
                  report.recentLogs.map((log) => {
                    const isTaken = log.status === 'TAKEN';
                    const isSnoozed = log.status === 'SNOOZED';
                    const isPostponed = log.status === 'POSTPONED';
                    const isOthers = log.status === 'OTHERS';
                    const isDismissed = log.status === 'DISMISSED';

                    return (
                      <View
                        key={log.id}
                        style={[
                          styles.logItem,
                          {
                            borderColor: colors.border,
                            borderLeftColor: isTaken
                              ? colors.success
                              : isSnoozed
                              ? '#F59E0B'
                              : isPostponed
                              ? '#3B82F6'
                              : isOthers
                              ? '#8B5CF6'
                              : colors.danger,
                          },
                        ]}>
                        <View style={styles.logLeft}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <PillIcon size={15} color={colors.primary} />
                            <Text style={[styles.logMedName, { color: colors.text }]}>
                              {log.medicineName || 'Medication'}
                            </Text>
                            {log.slot && (
                              <Text style={[styles.logSlotTag, { color: colors.textSecondary }]}>
                                • {log.slot}
                              </Text>
                            )}
                          </View>
                          {(log.reason || log.notes) && (
                            <Text style={[styles.logNotes, { color: colors.textMuted }]}>
                              {log.reason ? `Reason: ${log.reason}` : log.notes}
                            </Text>
                          )}
                        </View>

                        <View style={styles.logRight}>
                          <View
                            style={[
                              styles.statusBadgeSmall,
                              {
                                backgroundColor: isTaken
                                  ? colors.successBg
                                  : isSnoozed
                                  ? '#FEF3C7'
                                  : isPostponed
                                  ? '#EFF6FF'
                                  : isOthers
                                  ? '#EDE9FE'
                                  : '#FEE2E2',
                              },
                            ]}>
                            <Text
                              style={[
                                styles.statusBadgeSmallText,
                                {
                                  color: isTaken
                                    ? colors.success
                                    : isSnoozed
                                    ? '#B45309'
                                    : isPostponed
                                    ? '#1D4ED8'
                                    : isOthers
                                    ? '#7C3AED'
                                    : colors.danger,
                                },
                              ]}>
                              {log.status}
                            </Text>
                          </View>
                          <Text style={[styles.logTimeText, { color: colors.textMuted }]}>
                            {log.actionTime ? log.actionTime.replace('T', ' ').slice(0, 16) : log.logDate}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={[styles.emptyTimeline, { color: colors.textMuted }]}>
                    No medication activity logged yet. Respond to notifications or click quick record buttons above!
                  </Text>
                )}
              </View>
            </>
          )}
        </>
      )}

      {/* ========================================================
          TAB 2: SEPARATE DETAILED TABULAR REPORT (5 CATEGORIES + REASONS)
      ======================================================== */}
      {activeTab === 'tabular' && (
        <View style={styles.tabularContainer}>
          {/* Header & Controls */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Detailed Tabular Intake Report
                </Text>
                <View
                  style={[
                    styles.liveSyncBadge,
                    {
                      backgroundColor: isSyncing ? (isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7') : (isDark ? 'rgba(22,163,74,0.2)' : '#DCFCE7'),
                      borderColor: isSyncing ? '#F59E0B' : '#16A34A',
                    },
                  ]}>
                  <View style={[styles.liveDot, { backgroundColor: isSyncing ? '#F59E0B' : '#16A34A' }]} />
                  <Text style={[styles.liveSyncText, { color: isSyncing ? '#B45309' : '#16A34A' }]}>
                    {isSyncing ? 'Syncing DB...' : `Live DB Sync • ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Chronological table covering all 5 categories (Taken, Snoozed, Postponed, Dismissed, Others) with patient-entered reasons.
              </Text>
            </View>

            {/* Export & Action Buttons */}
            <View style={styles.filterRow}>
              <Pressable
                onPress={handleExportCSV}
                style={[styles.exportBtn, { backgroundColor: '#10B981' }]}>
                <DownloadIcon size={14} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>Download CSV</Text>
              </Pressable>

              <Pressable
                onPress={handleExportTabularPDF}
                style={[styles.exportBtn, { backgroundColor: colors.primary }]}>
                <FileTextIcon size={14} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>Download PDF</Text>
              </Pressable>

              <Pressable
                onPress={() => loadTabularReport(tabularDays, categoryFilter, false)}
                style={[
                  styles.refreshBtnExpanded,
                  {
                    backgroundColor: isDark ? colors.surfaceHighlight : '#EFF6FF',
                    borderColor: colors.primary,
                  },
                ]}>
                <RefreshIcon size={14} color={colors.primary} />
                <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
                  {isSyncing ? 'Syncing...' : 'Refresh DB'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Range & Category Filters */}
          <View style={[styles.tableFiltersCard, { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF', borderColor: colors.border }]}>
            {/* Category Filter Pills */}
            <View style={styles.categoryPillsRow}>
              {['ALL', 'TAKEN', 'SNOOZED', 'POSTPONED', 'OTHERS', 'DISMISSED'].map((cat) => {
                const isCatActive = categoryFilter === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategoryFilter(cat)}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isCatActive
                          ? cat === 'TAKEN' ? colors.success
                          : cat === 'SNOOZED' ? '#F59E0B'
                          : cat === 'POSTPONED' ? '#3B82F6'
                          : cat === 'OTHERS' ? '#8B5CF6'
                          : cat === 'DISMISSED' ? colors.danger
                          : colors.primary
                          : isDark ? colors.surfaceHighlight : '#F1F5F9',
                        borderColor: isCatActive ? 'transparent' : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: isCatActive ? '#FFFFFF' : colors.text },
                      ]}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Days Range Row */}
            <View style={styles.rangeSelectRow}>
              <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>Time Horizon:</Text>
              {[7, 14, 30, 90].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setTabularDays(d)}
                  style={[
                    styles.rangePillSmall,
                    {
                      backgroundColor: tabularDays === d ? colors.primary : 'transparent',
                      borderColor: tabularDays === d ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={[styles.rangePillSmallText, { color: tabularDays === d ? '#FFFFFF' : colors.text }]}>
                    {d}d
                  </Text>
                </Pressable>
              ))}
              <Text style={[styles.recordCountTag, { color: colors.textMuted }]}>
                Showing {tabularLogs.length} records
              </Text>
            </View>
          </View>

          {/* Table Data View */}
          {tabularLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading tabular records...
              </Text>
            </View>
          ) : tabularLogs.length === 0 ? (
            <View style={[styles.emptyTableCard, { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF', borderColor: colors.border }]}>
              <FileTextIcon size={32} color={colors.textMuted} />
              <Text style={[styles.emptyTableTitle, { color: colors.text }]}>
                No Tabular Records Found
              </Text>
              <Text style={[styles.emptyTableSub, { color: colors.textSecondary }]}>
                No events found matching category "{categoryFilter}" in the last {tabularDays} days.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScrollView}>
              <View style={[styles.tableCard, { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF', borderColor: colors.border }]}>
                {/* Table Header */}
                <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? colors.surfaceHighlight : '#F8FAFC', borderBottomColor: colors.border }]}>
                  <Text style={[styles.th, styles.colDate, { color: colors.textSecondary }]}>DATE & TIME</Text>
                  <Text style={[styles.th, styles.colMed, { color: colors.textSecondary }]}>MEDICINE NAME</Text>
                  <Text style={[styles.th, styles.colSlot, { color: colors.textSecondary }]}>SLOT</Text>
                  <Text style={[styles.th, styles.colStatus, { color: colors.textSecondary }]}>CATEGORY</Text>
                  <Text style={[styles.th, styles.colReason, { color: colors.textSecondary }]}>REASON / DETAILED NOTES</Text>
                </View>

                {/* Table Rows */}
                {tabularLogs.map((log, index) => {
                  const isTaken = log.status === 'TAKEN';
                  const isSnoozed = log.status === 'SNOOZED';
                  const isPostponed = log.status === 'POSTPONED';
                  const isOthers = log.status === 'OTHERS';

                  return (
                    <View
                      key={log.id || index}
                      style={[
                        styles.tableDataRow,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: index % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
                        },
                      ]}>
                      {/* Date & Time */}
                      <View style={styles.colDate}>
                        <Text style={[styles.tdMain, { color: colors.text }]}>{log.logDate}</Text>
                        <Text style={[styles.tdSub, { color: colors.textMuted }]}>
                          {log.actionTime ? log.actionTime.replace('T', ' ').slice(11, 16) : '—'}
                        </Text>
                      </View>

                      {/* Medicine Name */}
                      <View style={styles.colMed}>
                        <Text style={[styles.tdMain, { fontWeight: '700', color: colors.text }]}>
                          {log.medicineName || 'Medication'}
                        </Text>
                        {log.scheduledTime && (
                          <Text style={[styles.tdSub, { color: colors.textMuted }]}>
                            Sched: {log.scheduledTime}
                          </Text>
                        )}
                      </View>

                      {/* Scheduled Slot */}
                      <View style={styles.colSlot}>
                        <Text style={[styles.tdMain, { color: colors.textSecondary }]}>
                          {log.slot || '—'}
                        </Text>
                      </View>

                      {/* Status Category Badge */}
                      <View style={styles.colStatus}>
                        <View
                          style={[
                            styles.tableStatusBadge,
                            {
                              backgroundColor: isTaken
                                ? colors.successBg
                                : isSnoozed
                                ? '#FEF3C7'
                                : isPostponed
                                ? '#EFF6FF'
                                : isOthers
                                ? '#EDE9FE'
                                : '#FEE2E2',
                            },
                          ]}>
                          <Text
                            style={[
                              styles.tableStatusBadgeText,
                              {
                                color: isTaken
                                  ? colors.success
                                  : isSnoozed
                                  ? '#B45309'
                                  : isPostponed
                                  ? '#1D4ED8'
                                  : isOthers
                                  ? '#7C3AED'
                                  : colors.danger,
                              },
                            ]}>
                            {log.status}
                          </Text>
                        </View>
                      </View>

                      {/* Detailed Reason / Notes */}
                      <View style={styles.colReason}>
                        <Text
                          style={[
                            styles.tdReasonText,
                            {
                              color: log.reason ? (isOthers ? '#7C3AED' : colors.text) : colors.textMuted,
                              fontStyle: log.reason ? 'normal' : 'italic',
                              fontWeight: log.reason ? '600' : '400',
                            },
                          ]}>
                          {log.reason || log.notes || 'No specific reason recorded'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: Spacing.five,
  },
  mainTabNav: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 4,
    marginBottom: Spacing.four,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  activeTabBtn: {
    ...Shadows.sm,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
  rangePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveSyncText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  refreshBtnExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 5,
  },
  refreshBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  downloadReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    alignItems: 'center',
    gap: Spacing.four,
    flexWrap: 'wrap',
    ...Shadows.md,
  },
  heroLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRing: {
    width: 105,
    height: 105,
    borderRadius: 53,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroRight: {
    flex: 1,
    minWidth: 240,
  },
  badgeRow: {
    marginBottom: 6,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroSummary: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: Spacing.two,
  },
  quickLogRow: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  quickLogLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  quickBtns: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  miniBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 110,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiPercent: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingVertical: Spacing.two,
    minWidth: '100%',
  },
  barColumn: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    width: 44,
  },
  barTrack: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: 22,
    marginBottom: 6,
  },
  barStack: {
    width: 20,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  emptyBarSegment: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  barDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  barTotalText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  dayInspector: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  inspectorDate: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  inspectorStats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  timelineCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.four,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.three,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 6,
    borderRadius: BorderRadius.sm,
  },
  logLeft: {
    flex: 1,
  },
  logMedName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  logSlotTag: {
    fontSize: 12,
  },
  logNotes: {
    fontSize: 11,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadgeSmall: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  statusBadgeSmallText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  logTimeText: {
    fontSize: 10.5,
  },
  emptyTimeline: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  // Tabular Report Specific Styles
  tabularContainer: {
    width: '100%',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    gap: 5,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tableFiltersCard: {
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rangeSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 4,
  },
  rangeLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  rangePillSmall: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  rangePillSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recordCountTag: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  tableScrollView: {
    width: '100%',
  },
  tableCard: {
    minWidth: 720,
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  colDate: {
    width: 110,
  },
  colMed: {
    width: 170,
  },
  colSlot: {
    width: 90,
  },
  colStatus: {
    width: 110,
  },
  colReason: {
    flex: 1,
    paddingRight: 8,
  },
  tdMain: {
    fontSize: 12.5,
  },
  tdSub: {
    fontSize: 11,
    marginTop: 2,
  },
  tableStatusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  tableStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  tdReasonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyTableCard: {
    padding: Spacing.six,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTableTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyTableSub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
