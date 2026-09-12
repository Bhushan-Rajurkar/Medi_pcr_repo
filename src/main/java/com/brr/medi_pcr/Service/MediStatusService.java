package com.brr.medi_pcr.Service;

import com.brr.medi_pcr.Dto.MediStatusDtos;
import com.brr.medi_pcr.Entity.MediStatusLog;
import com.brr.medi_pcr.Entity.Medicine;
import com.brr.medi_pcr.Entity.Reminder;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.MediStatusLogRepository;
import com.brr.medi_pcr.Repository.MedicineRepository;
import com.brr.medi_pcr.Repository.ReminderRepository;
import com.brr.medi_pcr.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MediStatusService {

    @Autowired
    private MediStatusLogRepository mediStatusLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private ReminderRepository reminderRepository;

    private User resolveUser(String userEmail) {
        if (userEmail != null && !userEmail.trim().isEmpty()) {
            return userRepository.findByEmail(userEmail.trim()).orElse(null);
        }
        // Fallback: Pick user who has active prescriptions/medicines, or recent logs
        List<Medicine> allMeds = medicineRepository.findAll();
        for (Medicine m : allMeds) {
            if (m.getPrescription() != null && m.getPrescription().getUser() != null) {
                return m.getPrescription().getUser();
            }
        }
        List<MediStatusLog> latestLogs = mediStatusLogRepository.findAll();
        if (!latestLogs.isEmpty()) {
            for (int i = latestLogs.size() - 1; i >= 0; i--) {
                if (latestLogs.get(i).getUser() != null) {
                    return latestLogs.get(i).getUser();
                }
            }
        }
        return userRepository.findAll().stream().findFirst().orElse(null);
    }

    @Transactional
    public MediStatusDtos.LogResponse logStatus(String userEmail, MediStatusDtos.LogRequest req) {
        User user = resolveUser(userEmail);

        Medicine medicine = null;
        if (req.getMedicineId() != null) {
            medicine = medicineRepository.findById(req.getMedicineId()).orElse(null);
        }

        Reminder reminder = null;
        if (req.getReminderId() != null) {
            reminder = reminderRepository.findById(req.getReminderId()).orElse(null);
            if (medicine == null && reminder != null) {
                medicine = reminder.getMedicine();
            }
        }

        String medName = req.getMedicineName();
        if (medName == null && medicine != null) {
            medName = medicine.getMedicineName();
        }
        if (medName == null) {
            medName = "Medication";
        }

        String slot = req.getSlot();
        if (slot == null && reminder != null) {
            slot = reminder.getSlot();
        }

        // Standardize status: TAKEN, SNOOZED, DISMISSED, POSTPONED, OTHERS
        String rawStatus = req.getStatus() != null ? req.getStatus().toUpperCase() : "TAKEN";
        String status;
        String notes = req.getNotes();

        if (reminder != null && reminder.getOriginalTime() == null && reminder.getReminderTime() != null) {
            reminder.setOriginalTime(reminder.getReminderTime());
        }

        if (rawStatus.contains("TAKE") || rawStatus.contains("COMPLETE")) {
            status = "TAKEN";
            if (reminder != null) {
                reminder.setSnoozeCount(0);
                if (reminder.getOriginalTime() != null) reminder.setReminderTime(reminder.getOriginalTime());
                reminderRepository.save(reminder);
            }
        } else if (rawStatus.contains("SNOOZE")) {
            if (reminder != null) {
                int currentSnooze = reminder.getSnoozeCount();
                if (currentSnooze < 5) {
                    reminder.setSnoozeCount(currentSnooze + 1);
                    reminder.setReminderTime(LocalTime.now().plusMinutes(5));
                    reminderRepository.save(reminder);
                    status = "SNOOZED";
                    notes = notes != null ? notes : ("Snoozed (" + (currentSnooze + 1) + "/6): next alert in 5 min");
                } else {
                    // 6th iteration reached: auto-dismiss
                    status = "DISMISSED";
                    reminder.setSnoozeCount(0);
                    if (reminder.getOriginalTime() != null) reminder.setReminderTime(reminder.getOriginalTime());
                    reminderRepository.save(reminder);
                    notes = "Auto-dismissed after 6 snooze iterations (30 minutes)";
                }
            } else {
                status = "SNOOZED";
            }
        } else if (rawStatus.contains("DISMISS")) {
            status = "DISMISSED";
            if (reminder != null) {
                reminder.setSnoozeCount(0);
                if (reminder.getOriginalTime() != null) reminder.setReminderTime(reminder.getOriginalTime());
                reminderRepository.save(reminder);
            }
        } else if (rawStatus.contains("POSTPONE")) {
            status = "POSTPONED";
            if (reminder != null) {
                reminder.setLastPostponedDate(LocalDate.now());
                reminder.setSnoozeCount(0);
                if (reminder.getOriginalTime() != null) reminder.setReminderTime(reminder.getOriginalTime());
                reminderRepository.save(reminder);
            }
            notes = notes != null ? notes : "Postponed: skipped for today at this timing";
        } else if (rawStatus.contains("OTHER")) {
            status = "OTHERS";
            if (reminder != null) {
                reminder.setSnoozeCount(0);
                if (reminder.getOriginalTime() != null) reminder.setReminderTime(reminder.getOriginalTime());
                reminderRepository.save(reminder);
            }
        } else {
            status = rawStatus;
        }

        MediStatusLog log = MediStatusLog.builder()
                .status(status)
                .medicineName(medName)
                .slot(slot)
                .scheduledTime(req.getScheduledTime())
                .logDate(LocalDate.now())
                .actionTime(LocalDateTime.now())
                .reason(req.getReason())
                .notes(notes)
                .user(user)
                .medicine(medicine)
                .reminder(reminder)
                .build();

        if (reminder != null) {
            reminder.setMediStatus(status);
            reminder.setLastActionDate(LocalDate.now());
            reminderRepository.save(reminder);
        }

        if (medicine != null) {
            updateSlotStatusOnMedicine(medicine, slot, status);
        }

        MediStatusLog saved = mediStatusLogRepository.save(log);
        return toLogResponse(saved);
    }

    private void updateSlotStatusOnMedicine(Medicine med, String slot, String status) {
        if (med == null || status == null) return;
        if (slot != null) {
            String s = slot.trim().toUpperCase();
            if (s.contains("MORN")) {
                med.setMorningStatus(status);
            } else if (s.contains("AFTER")) {
                med.setAfternoonStatus(status);
            } else if (s.contains("EVEN")) {
                med.setEveningStatus(status);
            } else if (s.contains("NIGHT")) {
                med.setNightStatus(status);
            }
        }
        medicineRepository.save(med);
    }

    @Transactional
    public List<MediStatusDtos.LogResponse> logBatchStatus(String userEmail, MediStatusDtos.BatchLogRequest req) {
        User user = null;
        if (userEmail != null && !userEmail.trim().isEmpty()) {
            user = userRepository.findByEmail(userEmail.trim()).orElse(null);
        }
        if (user == null && req.getUserEmail() != null && !req.getUserEmail().trim().isEmpty()) {
            user = userRepository.findByEmail(req.getUserEmail().trim()).orElse(null);
        }
        if (user == null && req.getUserId() != null) {
            user = userRepository.findById(req.getUserId()).orElse(null);
        }

        String rawStatus = req.getStatus() != null ? req.getStatus().toUpperCase() : "TAKEN";
        String requestedAction;
        if (rawStatus.contains("TAKE") || rawStatus.contains("COMPLETE")) {
            requestedAction = "TAKEN";
        } else if (rawStatus.contains("SNOOZE")) {
            requestedAction = "SNOOZED";
        } else if (rawStatus.contains("DISMISS")) {
            requestedAction = "DISMISSED";
        } else if (rawStatus.contains("POSTPONE")) {
            requestedAction = "POSTPONED";
        } else if (rawStatus.contains("OTHER")) {
            requestedAction = "OTHERS";
        } else {
            requestedAction = rawStatus;
        }

        List<MediStatusDtos.LogResponse> responses = new ArrayList<>();
        Set<Long> processedMedicineIds = new HashSet<>();

        // 1. Process from reminderIds if provided
        if (req.getReminderIds() != null && !req.getReminderIds().isEmpty()) {
            for (Long rId : req.getReminderIds()) {
                Reminder r = reminderRepository.findById(rId).orElse(null);
                if (r != null) {
                    Medicine med = r.getMedicine();
                    User itemUser = user;
                    if (itemUser == null && med != null && med.getPrescription() != null && med.getPrescription().getUser() != null) {
                        itemUser = med.getPrescription().getUser();
                    }
                    if (user == null && itemUser != null) {
                        user = itemUser;
                    }

                    if (r.getOriginalTime() == null && r.getReminderTime() != null) {
                        r.setOriginalTime(r.getReminderTime());
                    }

                    String itemStatus = requestedAction;
                    String itemNotes = req.getNotes();

                    if ("SNOOZED".equals(requestedAction)) {
                        int currentSnooze = r.getSnoozeCount();
                        if (currentSnooze < 5) {
                            r.setSnoozeCount(currentSnooze + 1);
                            r.setReminderTime(LocalTime.now().plusMinutes(5));
                            itemStatus = "SNOOZED";
                            itemNotes = itemNotes != null ? itemNotes : ("Snoozed (" + (currentSnooze + 1) + "/6): next alert in 5 min");
                        } else {
                            // 6th iteration reached: auto-dismiss
                            itemStatus = "DISMISSED";
                            r.setSnoozeCount(0);
                            if (r.getOriginalTime() != null) r.setReminderTime(r.getOriginalTime());
                            itemNotes = "Auto-dismissed after 6 snooze iterations (30 minutes)";
                        }
                    } else if ("POSTPONED".equals(requestedAction)) {
                        r.setLastPostponedDate(LocalDate.now());
                        r.setSnoozeCount(0);
                        if (r.getOriginalTime() != null) r.setReminderTime(r.getOriginalTime());
                        itemNotes = itemNotes != null ? itemNotes : "Postponed: skipped for today at this timing";
                    } else {
                        // TAKEN, DISMISSED, OTHERS
                        r.setSnoozeCount(0);
                        if (r.getOriginalTime() != null) r.setReminderTime(r.getOriginalTime());
                    }

                    Long medId = med != null ? med.getId() : null;
                    if (medId != null) {
                        processedMedicineIds.add(medId);
                    }

                    MediStatusLog log = MediStatusLog.builder()
                            .status(itemStatus)
                            .medicineName(med != null ? med.getMedicineName() : "Medication")
                            .slot(r.getSlot() != null ? r.getSlot() : req.getSlot())
                            .scheduledTime(r.getReminderTime() != null ? r.getReminderTime() : req.getScheduledTime())
                            .logDate(LocalDate.now())
                            .actionTime(LocalDateTime.now())
                            .reason(req.getReason())
                            .notes(itemNotes != null ? itemNotes : ("Marked as " + itemStatus.toLowerCase() + " via grouped notification action (1-click)"))
                            .user(user)
                            .medicine(med)
                            .reminder(r)
                            .build();

                    r.setMediStatus(itemStatus);
                    r.setLastActionDate(LocalDate.now());
                    reminderRepository.save(r);

                    if (med != null) {
                        updateSlotStatusOnMedicine(med, r.getSlot(), itemStatus);
                    }

                    responses.add(toLogResponse(mediStatusLogRepository.save(log)));
                }
            }
        }

        // 2. Process medicineIds that were not already logged via reminderIds
        if (req.getMedicineIds() != null && !req.getMedicineIds().isEmpty()) {
            for (Long mId : req.getMedicineIds()) {
                if (processedMedicineIds.contains(mId)) {
                    continue;
                }
                Medicine med = medicineRepository.findById(mId).orElse(null);
                if (med != null) {
                    User itemUser = user;
                    if (itemUser == null && med.getPrescription() != null && med.getPrescription().getUser() != null) {
                        itemUser = med.getPrescription().getUser();
                    }
                    if (user == null && itemUser != null) {
                        user = itemUser;
                    }
                    Reminder r = null;
                    if (med.getReminders() != null && !med.getReminders().isEmpty()) {
                        if (req.getSlot() != null) {
                            r = med.getReminders().stream()
                                    .filter(rem -> req.getSlot().equalsIgnoreCase(rem.getSlot()))
                                    .findFirst()
                                    .orElse(med.getReminders().get(0));
                        } else if (req.getScheduledTime() != null) {
                            r = med.getReminders().stream()
                                    .filter(rem -> rem.getReminderTime() != null
                                            && rem.getReminderTime().getHour() == req.getScheduledTime().getHour()
                                            && rem.getReminderTime().getMinute() == req.getScheduledTime().getMinute())
                                    .findFirst()
                                    .orElse(med.getReminders().get(0));
                        } else {
                            LocalTime now = LocalTime.now();
                            r = med.getReminders().stream()
                                    .filter(rem -> rem.getReminderTime() != null
                                            && Math.abs((rem.getReminderTime().getHour() * 60 + rem.getReminderTime().getMinute())
                                                    - (now.getHour() * 60 + now.getMinute())) <= 30)
                                    .findFirst()
                                    .orElse(med.getReminders().get(0));
                        }
                    }

                    String itemStatus = requestedAction;
                    String itemNotes = req.getNotes();

                    if (r == null && med != null && "SNOOZED".equals(requestedAction)) {
                        r = Reminder.builder()
                                .medicine(med)
                                .slot(req.getSlot() != null ? req.getSlot() : "SCHEDULED")
                                .reminderTime(LocalTime.now().plusMinutes(5))
                                .originalTime(LocalTime.now())
                                .snoozeCount(1)
                                .mediStatus("SNOOZED")
                                .build();
                        r = reminderRepository.save(r);
                    }

                    if (r != null) {
                        if (r.getOriginalTime() == null && r.getReminderTime() != null) {
                            r.setOriginalTime(r.getReminderTime());
                        }

                        if ("SNOOZED".equals(requestedAction)) {
                            int currentSnooze = r.getSnoozeCount();
                            if (currentSnooze < 5) {
                                r.setSnoozeCount(currentSnooze + 1);
                                r.setReminderTime(LocalTime.now().plusMinutes(5));
                                reminderRepository.save(r);
                                itemStatus = "SNOOZED";
                                itemNotes = itemNotes != null ? itemNotes : ("Snoozed (" + (currentSnooze + 1) + "/6): next alert in 5 min");
                            } else {
                                itemStatus = "DISMISSED";
                                r.setSnoozeCount(0);
                                if (r.getOriginalTime() != null) r.setReminderTime(r.getOriginalTime());
                                reminderRepository.save(r);
                                itemNotes = "Auto-dismissed after 6 snooze iterations (30 minutes)";
                            }
                        } else if ("POSTPONED".equals(requestedAction)) {
                            r.setLastPostponedDate(LocalDate.now());
                            r.setSnoozeCount(0);
                            if (r.getOriginalTime() != null) r.setReminderTime(r.getOriginalTime());
                            reminderRepository.save(r);
                            itemNotes = itemNotes != null ? itemNotes : "Postponed: skipped for today at this timing";
                        } else {
                            r.setSnoozeCount(0);
                            if (r.getOriginalTime() != null) r.setReminderTime(r.getOriginalTime());
                            reminderRepository.save(r);
                        }
                    }

                    MediStatusLog log = MediStatusLog.builder()
                            .status(itemStatus)
                            .medicineName(med.getMedicineName())
                            .slot(r != null ? r.getSlot() : req.getSlot())
                            .scheduledTime(r != null ? r.getReminderTime() : req.getScheduledTime())
                            .logDate(LocalDate.now())
                            .actionTime(LocalDateTime.now())
                            .reason(req.getReason())
                            .notes(itemNotes != null ? itemNotes : ("Marked as " + itemStatus.toLowerCase() + " via grouped notification action (1-click)"))
                            .user(itemUser)
                            .medicine(med)
                            .reminder(r)
                            .build();

                    if (r != null) {
                        r.setMediStatus(itemStatus);
                        r.setLastActionDate(LocalDate.now());
                        reminderRepository.save(r);
                    }

                    if (med != null) {
                        updateSlotStatusOnMedicine(med, r != null ? r.getSlot() : req.getSlot(), itemStatus);
                    }

                    responses.add(toLogResponse(mediStatusLogRepository.save(log)));
                    processedMedicineIds.add(mId);
                }
            }
        }

        // Fallback: If no specific medicine IDs matched, but user is resolved, record the action under the user
        if (responses.isEmpty() && user != null) {
            MediStatusLog log = MediStatusLog.builder()
                    .status(requestedAction)
                    .medicineName("Daily Medication")
                    .slot(req.getSlot() != null ? req.getSlot() : "SCHEDULED")
                    .scheduledTime(req.getScheduledTime() != null ? req.getScheduledTime() : LocalTime.now())
                    .logDate(LocalDate.now())
                    .actionTime(LocalDateTime.now())
                    .reason(req.getReason())
                    .notes(req.getNotes() != null ? req.getNotes() : ("Marked as " + requestedAction.toLowerCase() + " via device notification"))
                    .user(user)
                    .build();
            responses.add(toLogResponse(mediStatusLogRepository.save(log)));
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public MediStatusDtos.ReportResponse getReport(String userEmail, int days) {
        User user = resolveUser(userEmail);
        if (user == null) {
            user = userRepository.findAll().stream().findFirst().orElse(null);
        }

        int reportDays = days > 0 ? days : 7;
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(reportDays - 1);

        if (user == null) {
            return MediStatusDtos.ReportResponse.builder()
                    .totalEvents(0)
                    .takenCount(0)
                    .snoozedCount(0)
                    .dismissedCount(0)
                    .postponedCount(0)
                    .othersCount(0)
                    .adherenceRate(0.0)
                    .dailyBreakdown(new ArrayList<>())
                    .recentLogs(new ArrayList<>())
                    .build();
        }

        List<MediStatusLog> logs = mediStatusLogRepository
                .findByUserAndLogDateBetweenOrderByActionTimeDesc(user, startDate, endDate);

        long taken = 0;
        long snoozed = 0;
        long dismissed = 0;
        long postponed = 0;
        long others = 0;

        Map<LocalDate, Map<String, Long>> dailyMap = new HashMap<>();
        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            Map<String, Long> statusCounts = new HashMap<>();
            statusCounts.put("TAKEN", 0L);
            statusCounts.put("SNOOZED", 0L);
            statusCounts.put("DISMISSED", 0L);
            statusCounts.put("POSTPONED", 0L);
            statusCounts.put("OTHERS", 0L);
            dailyMap.put(d, statusCounts);
        }

        for (MediStatusLog l : logs) {
            String s = l.getStatus() != null ? l.getStatus().toUpperCase() : "TAKEN";
            if ("TAKEN".equals(s)) taken++;
            else if ("SNOOZED".equals(s)) snoozed++;
            else if ("DISMISSED".equals(s)) dismissed++;
            else if ("POSTPONED".equals(s)) postponed++;
            else if ("OTHERS".equals(s)) others++;

            if (dailyMap.containsKey(l.getLogDate())) {
                Map<String, Long> sc = dailyMap.get(l.getLogDate());
                sc.put(s, sc.getOrDefault(s, 0L) + 1L);
            }
        }

        long total = taken + snoozed + dismissed + postponed + others;
        double adherenceRate = total > 0 ? Math.round(((double) taken / total) * 1000.0) / 10.0 : 0.0;

        List<MediStatusDtos.DailyAdherence> dailyBreakdown = new ArrayList<>();
        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            Map<String, Long> sc = dailyMap.get(d);
            long dTaken = sc.getOrDefault("TAKEN", 0L);
            long dSnoozed = sc.getOrDefault("SNOOZED", 0L);
            long dDismissed = sc.getOrDefault("DISMISSED", 0L);
            long dPostponed = sc.getOrDefault("POSTPONED", 0L);
            long dOthers = sc.getOrDefault("OTHERS", 0L);
            long dTotal = dTaken + dSnoozed + dDismissed + dPostponed + dOthers;

            dailyBreakdown.add(MediStatusDtos.DailyAdherence.builder()
                    .date(d)
                    .taken(dTaken)
                    .snoozed(dSnoozed)
                    .dismissed(dDismissed)
                    .postponed(dPostponed)
                    .others(dOthers)
                    .total(dTotal)
                    .build());
        }

        List<MediStatusDtos.LogResponse> recent = logs.stream()
                .limit(30)
                .map(this::toLogResponse)
                .collect(Collectors.toList());

        return MediStatusDtos.ReportResponse.builder()
                .totalEvents(total)
                .takenCount(taken)
                .snoozedCount(snoozed)
                .dismissedCount(dismissed)
                .postponedCount(postponed)
                .othersCount(others)
                .adherenceRate(adherenceRate)
                .dailyBreakdown(dailyBreakdown)
                .recentLogs(recent)
                .build();
    }

    @Transactional(readOnly = true)
    public MediStatusDtos.TabularReportResponse getTabularReport(String userEmail, int days, String categoryFilter) {
        User user = resolveUser(userEmail);
        if (user == null) {
            user = userRepository.findAll().stream().findFirst().orElse(null);
        }
        int reportDays = days > 0 ? days : 30;
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(reportDays - 1);

        if (user == null) {
            return MediStatusDtos.TabularReportResponse.builder()
                    .totalCount(0)
                    .takenCount(0)
                    .snoozedCount(0)
                    .dismissedCount(0)
                    .postponedCount(0)
                    .othersCount(0)
                    .rows(new ArrayList<>())
                    .build();
        }

        List<MediStatusLog> logs = mediStatusLogRepository
                .findByUserAndLogDateBetweenOrderByActionTimeDesc(user, startDate, endDate);

        long taken = 0, snoozed = 0, dismissed = 0, postponed = 0, others = 0;
        List<MediStatusDtos.TabularLogItem> rows = new ArrayList<>();

        for (MediStatusLog l : logs) {
            String s = l.getStatus() != null ? l.getStatus().toUpperCase() : "TAKEN";
            if ("TAKEN".equals(s)) taken++;
            else if ("SNOOZED".equals(s)) snoozed++;
            else if ("DISMISSED".equals(s)) dismissed++;
            else if ("POSTPONED".equals(s)) postponed++;
            else if ("OTHERS".equals(s)) others++;

            if (categoryFilter != null && !categoryFilter.isBlank() && !"ALL".equalsIgnoreCase(categoryFilter)) {
                if (!categoryFilter.equalsIgnoreCase(s)) {
                    continue;
                }
            }

            rows.add(MediStatusDtos.TabularLogItem.builder()
                    .id(l.getId())
                    .date(l.getLogDate())
                    .time(l.getActionTime() != null ? l.getActionTime().toLocalTime().withNano(0) : null)
                    .medicineName(l.getMedicineName())
                    .slot(l.getSlot())
                    .scheduledTime(l.getScheduledTime())
                    .category(s)
                    .reason(l.getReason())
                    .notes(l.getNotes())
                    .build());
        }

        return MediStatusDtos.TabularReportResponse.builder()
                .totalCount(rows.size())
                .takenCount(taken)
                .snoozedCount(snoozed)
                .dismissedCount(dismissed)
                .postponedCount(postponed)
                .othersCount(others)
                .rows(rows)
                .build();
    }

    @Transactional(readOnly = true)
    public List<MediStatusDtos.LogResponse> getHistory(String userEmail) {
        User user = resolveUser(userEmail);
        if (user == null) {
            return new ArrayList<>();
        }

        return mediStatusLogRepository.findByUserOrderByActionTimeDesc(user).stream()
                .limit(50)
                .map(this::toLogResponse)
                .collect(Collectors.toList());
    }

    private MediStatusDtos.LogResponse toLogResponse(MediStatusLog log) {
        return MediStatusDtos.LogResponse.builder()
                .id(log.getId())
                .status(log.getStatus())
                .medicineName(log.getMedicineName())
                .slot(log.getSlot())
                .scheduledTime(log.getScheduledTime())
                .logDate(log.getLogDate())
                .actionTime(log.getActionTime())
                .reason(log.getReason())
                .notes(log.getNotes())
                .build();
    }
}
