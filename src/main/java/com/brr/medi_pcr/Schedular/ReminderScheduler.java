package com.brr.medi_pcr.Schedular;

import com.brr.medi_pcr.Entity.Medicine;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.MedicineRepository;
import com.brr.medi_pcr.Repository.UserRepository;
import com.brr.medi_pcr.Service.FCMNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FCMNotificationService fcmNotificationService;

    // Default timings if the user hasn't set custom times
    private static final LocalTime DEFAULT_MORNING = LocalTime.of(10, 0);   // 10:00 AM
    private static final LocalTime DEFAULT_AFTERNOON = LocalTime.of(14, 0); // 2:00 PM
    private static final LocalTime DEFAULT_EVENING = LocalTime.of(18, 0);   // 6:00 PM
    private static final LocalTime DEFAULT_NIGHT = LocalTime.of(22, 0);     // 10:00 PM

    @Transactional
    @Scheduled(cron = "0 * * * * *") // Runs every minute at the 0th second
    public void scheduleMedicineReminders() {
        LocalTime currentTime = LocalTime.now().truncatedTo(ChronoUnit.MINUTES);
        LocalDate currentDate = LocalDate.now();

        List<Medicine> activeMedicines = medicineRepository.findByStatus("ACTIVE");

        if (activeMedicines == null || activeMedicines.isEmpty()) {
            return;
        }

        // Filter valid dates and exact matching times
        List<Medicine> medicinesDueNow = activeMedicines.stream()
                .filter(med -> isDateValid(med, currentDate))
                .filter(med -> isTimeMatching(med, currentTime))
                .collect(Collectors.toList());

        if (medicinesDueNow.isEmpty()) {
            return;
        }

        log.info("⏰ [ReminderScheduler] At {} found {} medicines due for notification: {}",
                currentTime,
                medicinesDueNow.size(),
                medicinesDueNow.stream().map(Medicine::getMedicineName).collect(Collectors.joining(", ")));

        // Group by user's FCM token
        Map<String, List<Medicine>> medicinesByToken = medicinesDueNow.stream()
                .filter(med -> getPatientFcmToken(med) != null && !getPatientFcmToken(med).isBlank())
                .collect(Collectors.groupingBy(this::getPatientFcmToken));

        if (medicinesByToken.isEmpty()) {
            log.warn("⚠️ [ReminderScheduler] Medicines are due at {} but NO FCM token was found for any user! Medicines: {}",
                    currentTime,
                    medicinesDueNow.stream().map(Medicine::getMedicineName).collect(Collectors.joining(", ")));
            return;
        }

        // Dispatch notifications to unique registered device tokens
        List<String> deadTokens = new java.util.ArrayList<>();
        for (Map.Entry<String, List<Medicine>> entry : medicinesByToken.entrySet()) {
            String tokenString = entry.getKey();
            List<Medicine> meds = entry.getValue();
            java.util.Set<String> uniqueTokens = java.util.Arrays.stream(tokenString.split(","))
                    .map(String::trim)
                    .filter(t -> !t.isEmpty())
                    .collect(Collectors.toSet());
            for (String cleanToken : uniqueTokens) {
                log.info("🚀 [ReminderScheduler] Sending FCM push notification for {} medicines to device token {}...",
                        meds.size(), cleanToken.substring(0, Math.min(18, cleanToken.length())) + "...");
                List<String> results = fcmNotificationService.sendGroupedReminders(meds, cleanToken, currentTime);
                for (String r : results) {
                    if (r != null && (r.contains("NotRegistered") || r.contains("Requested entity was not found"))) {
                        log.warn("⚠️ [ReminderScheduler] Stale/unregistered token detected by Firebase ({}). Flagging to purge: {}",
                                r, cleanToken.substring(0, Math.min(15, cleanToken.length())) + "...");
                        deadTokens.add(cleanToken);
                        break;
                    }
                }
            }
        }

        // Auto-purge dead/unregistered tokens from database
        if (!deadTokens.isEmpty()) {
            for (com.brr.medi_pcr.Entity.User u : userRepository.findAll()) {
                if (u.getFcmToken() != null && !u.getFcmToken().isBlank()) {
                    List<String> valid = java.util.Arrays.stream(u.getFcmToken().split(","))
                            .map(String::trim)
                            .filter(t -> !t.isEmpty() && !deadTokens.contains(t))
                            .collect(Collectors.toList());
                    String newTokens = String.join(",", valid);
                    if (!newTokens.equals(u.getFcmToken())) {
                        u.setFcmToken(newTokens.isEmpty() ? null : newTokens);
                        userRepository.save(u);
                        log.info("🧹 [ReminderScheduler] Automatically purged dead/unregistered FCM token from user {}", u.getEmail());
                    }
                }
            }
        }
    }

    private boolean isDateValid(Medicine med, LocalDate today) {
        if (med.getStartDate() != null && today.isBefore(med.getStartDate())) return false;
        if (med.getEndDate() != null && today.isAfter(med.getEndDate())) return false;
        return true;
    }

    /**
     * Daily reset at midnight: resets all daily slot statuses back to PENDING for each new day.
     */
    @Transactional
    @Scheduled(cron = "0 0 0 * * *")
    public void dailyMidnightStatusReset() {
        log.info("🌅 [ReminderScheduler] Running daily midnight reset for all active medicine reminder slots...");
        List<Medicine> allActive = medicineRepository.findByStatus("ACTIVE");
        for (Medicine m : allActive) {
            m.setMorningStatus("PENDING");
            m.setAfternoonStatus("PENDING");
            m.setEveningStatus("PENDING");
            m.setNightStatus("PENDING");
            if (m.getReminders() != null) {
                for (com.brr.medi_pcr.Entity.Reminder r : m.getReminders()) {
                    r.setMediStatus("PENDING");
                    r.setSnoozeCount(0);
                    r.setLastPostponedDate(null);
                    r.setLastActionDate(null);
                    if (r.getOriginalTime() != null) {
                        r.setReminderTime(r.getOriginalTime());
                    }
                }
            }
            medicineRepository.save(m);
        }
        log.info("✅ [ReminderScheduler] Reset completed for {} active medicines", allActive.size());
    }

    /**
     * Checks all boolean flags and Reminder entity state against current time.
     * Supports dynamic 5-minute snoozed timings and skips postponed medicines for today.
     */
    public boolean isTimeMatching(Medicine med, LocalTime currentTime) {
        LocalDate today = LocalDate.now();

        // 1. If child reminders exist, prioritize reminder entities (which reflect snoozed and postponed state)
        if (med.getReminders() != null && !med.getReminders().isEmpty()) {
            for (com.brr.medi_pcr.Entity.Reminder r : med.getReminders()) {
                // If postponed today, skip this reminder
                if (r.getLastPostponedDate() != null && r.getLastPostponedDate().equals(today)) {
                    continue;
                }
                // If marked POSTPONED, DISMISSED, MISSED, or TAKEN for this slot TODAY, skip this reminder
                boolean actedToday = r.getLastActionDate() != null && r.getLastActionDate().equals(today);
                String rStatus = r.getMediStatus() != null ? r.getMediStatus().toUpperCase() : "";
                if (actedToday && (rStatus.contains("TAKE") || rStatus.contains("DISMISS") || rStatus.contains("MISS") || rStatus.contains("POSTPONE"))) {
                    continue;
                }
                if (r.getReminderTime() != null) {
                    if (r.getReminderTime().getHour() == currentTime.getHour()
                            && r.getReminderTime().getMinute() == currentTime.getMinute()) {
                        return true;
                    }
                }
            }
            return false;
        }

        // 2. Fallback to individual boolean slot statuses on medicine entity
        boolean isDue = false;
        if (isSlotDue(med.isMorning(), med.getMorningStatus(), med.getMorningTime(), DEFAULT_MORNING, med.getFoodInstruction(), currentTime)) {
            isDue = true;
        }
        if (isSlotDue(med.isAfternoon(), med.getAfternoonStatus(), med.getAfternoonTime(), DEFAULT_AFTERNOON, med.getFoodInstruction(), currentTime)) {
            isDue = true;
        }
        if (isSlotDue(med.isEvening(), med.getEveningStatus(), med.getEveningTime(), DEFAULT_EVENING, med.getFoodInstruction(), currentTime)) {
            isDue = true;
        }
        if (isSlotDue(med.isNight(), med.getNightStatus(), med.getNightTime(), DEFAULT_NIGHT, med.getFoodInstruction(), currentTime)) {
            isDue = true;
        }

        return isDue;
    }

    private boolean isSlotDue(boolean slotActive, String slotStatus, LocalTime userTime, LocalTime defaultTime, String foodInstruction, LocalTime currentTime) {
        if (!slotActive) return false;
        if (slotStatus != null) {
            String s = slotStatus.toUpperCase();
            if (s.contains("TAKE") || s.contains("DISMISS") || s.contains("MISS") || s.contains("POSTPONE")) {
                return false;
            }
        }
        return isDueForSlot(userTime, defaultTime, foodInstruction, currentTime);
    }

    /**
     * Calculates the exact time the reminder should trigger.
     * When user specifies a custom time (e.g. 20:30 for 8:30 PM), that exact user time is respected.
     */
    public boolean isDueForSlot(LocalTime userTime, LocalTime defaultTime, String foodInstruction, LocalTime currentTime) {
        LocalTime effectiveTime;
        if (userTime != null) {
            // User explicitly chose this time, so trigger at this exact time
            effectiveTime = userTime;
        } else {
            // Using default slot time, apply offset if BEFORE food instruction
            effectiveTime = defaultTime;
            if (foodInstruction != null && foodInstruction.toUpperCase().contains("BEFORE")) {
                effectiveTime = defaultTime.minusMinutes(60);
            }
        }

        return effectiveTime.getHour() == currentTime.getHour()
                && effectiveTime.getMinute() == currentTime.getMinute();
    }

    /**
     * Helper to navigate entities to find the user's or patient's FCM token.
     * Includes reliable fallbacks to ensure notifications never fail silently.
     */
    public String getPatientFcmToken(Medicine med) {
        try {
            if (med.getPrescription() != null) {
                // Priority 1: User's FCM token from prescription
                if (med.getPrescription().getUser() != null) {
                    User u = med.getPrescription().getUser();
                    if (u.getFcmToken() != null && !u.getFcmToken().isBlank()) {
                        return u.getFcmToken();
                    }
                    User refreshedUser = userRepository.findById(u.getId()).orElse(null);
                    if (refreshedUser != null && refreshedUser.getFcmToken() != null && !refreshedUser.getFcmToken().isBlank()) {
                        return refreshedUser.getFcmToken();
                    }
                }
                // Priority 2: Patient record FCM token
                if (med.getPrescription().getPatient() != null
                        && med.getPrescription().getPatient().getFcmToken() != null
                        && !med.getPrescription().getPatient().getFcmToken().isBlank()) {
                    return med.getPrescription().getPatient().getFcmToken();
                }
            }

            // Priority 3: Fallback to any active registered user with an FCM token
            return userRepository.findAll().stream()
                    .map(User::getFcmToken)
                    .filter(t -> t != null && !t.isBlank())
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            log.error("Error retrieving FCM token for medicine {}: {}", med.getMedicineName(), e.getMessage());
            return null;
        }
    }
}