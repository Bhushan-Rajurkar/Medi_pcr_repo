package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Entity.Reminder;
import com.brr.medi_pcr.Repository.ReminderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.Optional;

@RestController
@RequestMapping("/reminders")
@CrossOrigin(origins = "*")
public class ReminderController {

    @Autowired
    private ReminderRepository reminderRepository;

    @Autowired
    private com.brr.medi_pcr.Repository.MedicineRepository medicineRepository;

    @Autowired
    private com.brr.medi_pcr.Repository.UserRepository userRepository;

    @Autowired
    private com.brr.medi_pcr.Service.MediStatusService mediStatusService;

    @Autowired
    private com.brr.medi_pcr.Service.FCMNotificationService fcmNotificationService;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/debug-status")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> debugStatus(
            @RequestParam(required = false) String checkTime) {
        java.time.LocalTime now = java.time.LocalTime.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        java.time.LocalTime targetTime = checkTime != null ? java.time.LocalTime.parse(checkTime) : now;

        java.util.Map<String, Object> debug = new java.util.HashMap<>();
        debug.put("serverCurrentTime", now.toString());
        debug.put("targetCheckTime", targetTime.toString());
        debug.put("serverZone", java.time.ZoneId.systemDefault().toString());
        debug.put("serverDate", java.time.LocalDate.now().toString());

        java.util.List<com.brr.medi_pcr.Entity.Medicine> allMeds = medicineRepository.findAll();
        debug.put("totalMedicinesInDb", allMeds.size());

        java.util.List<java.util.Map<String, Object>> medList = new java.util.ArrayList<>();
        for (com.brr.medi_pcr.Entity.Medicine m : allMeds) {
            java.util.Map<String, Object> item = new java.util.HashMap<>();
            item.put("id", m.getId());
            item.put("name", m.getMedicineName());
            item.put("status", m.getStatus());
            item.put("foodInstruction", m.getFoodInstruction());
            item.put("morning", m.isMorning());
            item.put("morningTime", m.getMorningTime());
            item.put("afternoon", m.isAfternoon());
            item.put("afternoonTime", m.getAfternoonTime());
            item.put("evening", m.isEvening());
            item.put("eveningTime", m.getEveningTime());
            item.put("night", m.isNight());
            item.put("nightTime", m.getNightTime());
            item.put("startDate", m.getStartDate());
            item.put("endDate", m.getEndDate());
            item.put("mediStatus", m.getMediStatus());

            String userEmail = null;
            String userFcm = null;
            String patientFcm = null;
            if (m.getPrescription() != null) {
                if (m.getPrescription().getUser() != null) {
                    userEmail = m.getPrescription().getUser().getEmail();
                    userFcm = m.getPrescription().getUser().getFcmToken();
                }
                if (m.getPrescription().getPatient() != null) {
                    patientFcm = m.getPrescription().getPatient().getFcmToken();
                }
            }
            item.put("userEmail", userEmail);
            item.put("userFcmToken", userFcm != null ? (userFcm.substring(0, Math.min(15, userFcm.length())) + "...") : null);
            item.put("patientFcmToken", patientFcm);

            java.util.List<java.util.Map<String, Object>> rList = new java.util.ArrayList<>();
            if (m.getReminders() != null) {
                for (com.brr.medi_pcr.Entity.Reminder r : m.getReminders()) {
                    java.util.Map<String, Object> rMap = new java.util.HashMap<>();
                    rMap.put("id", r.getId());
                    rMap.put("slot", r.getSlot());
                    rMap.put("reminderTime", r.getReminderTime());
                    rMap.put("originalTime", r.getOriginalTime());
                    rMap.put("mediStatus", r.getMediStatus());
                    rMap.put("lastActionDate", r.getLastActionDate());
                    rMap.put("lastPostponedDate", r.getLastPostponedDate());
                    rList.add(rMap);
                }
            }
            item.put("reminders", rList);
            medList.add(item);
        }
        debug.put("medicines", medList);

        java.util.List<com.brr.medi_pcr.Entity.User> users = userRepository.findAll();
        java.util.List<java.util.Map<String, Object>> userSummary = new java.util.ArrayList<>();
        for (com.brr.medi_pcr.Entity.User u : users) {
            java.util.Map<String, Object> uMap = new java.util.HashMap<>();
            uMap.put("id", u.getId());
            uMap.put("email", u.getEmail());
            uMap.put("hasFcmToken", u.getFcmToken() != null && !u.getFcmToken().isBlank());
            uMap.put("fcmTokenPreview", u.getFcmToken() != null ? u.getFcmToken().substring(0, Math.min(20, u.getFcmToken().length())) + "..." : null);
            userSummary.add(uMap);
        }
        debug.put("users", userSummary);

        return ResponseEntity.ok(ApiResponse.success("Debug status retrieved", debug));
    }

    @PostMapping("/batch/{action}")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> batchAction(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String action,
            @RequestBody(required = false) com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        if (request == null) {
            request = new com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest();
        }
        request.setStatus(action);
        java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, request);
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("action", action);
        data.put("count", logs.size());
        data.put("logs", logs);
        return ResponseEntity.ok(ApiResponse.success("Updated MediStatus for " + logs.size() + " medicine(s) in 1 click", data));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<Object>> completeReminder(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String id,
            @RequestBody(required = false) com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        if ("batch".equalsIgnoreCase(id) || (request != null && ((request.getMedicineIds() != null && !request.getMedicineIds().isEmpty()) || (request.getReminderIds() != null && !request.getReminderIds().isEmpty())))) {
            if (request == null) request = new com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest();
            request.setStatus("TAKEN");
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, request);
            return ResponseEntity.ok(ApiResponse.success("Marked as taken for " + logs.size() + " medicine(s) in 1 click", logs));
        }

        if (id != null && (id.contains(",") || id.contains("&"))) {
            java.util.List<Long> rIds = parseIds(id);
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest.builder()
                    .reminderIds(rIds)
                    .status("TAKEN")
                    .notes("Marked as taken via notification action (1-click)")
                    .build());
            return ResponseEntity.ok(ApiResponse.success("Reminders marked as completed (" + logs.size() + " medicines)"));
        }

        try {
            Long singleId = Long.parseLong(id.trim());
            Optional<Reminder> reminderOpt = reminderRepository.findById(singleId);
            if (reminderOpt.isPresent()) {
                Reminder r = reminderOpt.get();
                if (email == null && r.getMedicine() != null && r.getMedicine().getPrescription() != null && r.getMedicine().getPrescription().getUser() != null) {
                    email = r.getMedicine().getPrescription().getUser().getEmail();
                }
                mediStatusService.logStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.LogRequest.builder()
                        .reminderId(r.getId())
                        .medicineId(r.getMedicine() != null ? r.getMedicine().getId() : null)
                        .medicineName(r.getMedicine() != null ? r.getMedicine().getMedicineName() : null)
                        .slot(r.getSlot())
                        .scheduledTime(r.getReminderTime())
                        .status("TAKEN")
                        .notes("Marked as taken via notification action")
                        .build());
                return ResponseEntity.ok(ApiResponse.success("Reminder marked as completed: " + r.getSlot()));
            }
        } catch (NumberFormatException ignored) {}
        return ResponseEntity.ok(ApiResponse.success("Reminder completed."));
    }

    @PostMapping("/{id}/snooze")
    public ResponseEntity<ApiResponse<Object>> snoozeReminder(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String id,
            @RequestBody(required = false) com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        if ("batch".equalsIgnoreCase(id) || (request != null && ((request.getMedicineIds() != null && !request.getMedicineIds().isEmpty()) || (request.getReminderIds() != null && !request.getReminderIds().isEmpty())))) {
            if (request == null) request = new com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest();
            request.setStatus("SNOOZED");
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, request);
            return ResponseEntity.ok(ApiResponse.success("Snoozed for " + logs.size() + " medicine(s) in 1 click", logs));
        }

        if (id != null && (id.contains(",") || id.contains("&"))) {
            java.util.List<Long> rIds = parseIds(id);
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest.builder()
                    .reminderIds(rIds)
                    .status("SNOOZED")
                    .notes("Snoozed for 10 minutes (1-click)")
                    .build());
            return ResponseEntity.ok(ApiResponse.success("Reminders snoozed (" + logs.size() + " medicines)"));
        }

        try {
            Long singleId = Long.parseLong(id.trim());
            Optional<Reminder> reminderOpt = reminderRepository.findById(singleId);
            if (reminderOpt.isPresent()) {
                Reminder r = reminderOpt.get();
                java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest.builder()
                        .reminderIds(java.util.Collections.singletonList(r.getId()))
                        .status("SNOOZED")
                        .notes("Snoozed for 5 minutes")
                        .build());
                return ResponseEntity.ok(ApiResponse.success("Reminder snoozed for 5 minutes.", logs));
            }
        } catch (NumberFormatException ignored) {}
        return ResponseEntity.ok(ApiResponse.success("Reminder snoozed."));
    }

    @PostMapping("/{id}/dismiss")
    public ResponseEntity<ApiResponse<Object>> dismissReminder(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String id,
            @RequestBody(required = false) com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        if ("batch".equalsIgnoreCase(id) || (request != null && ((request.getMedicineIds() != null && !request.getMedicineIds().isEmpty()) || (request.getReminderIds() != null && !request.getReminderIds().isEmpty())))) {
            if (request == null) request = new com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest();
            request.setStatus("DISMISSED");
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, request);
            return ResponseEntity.ok(ApiResponse.success("Dismissed for " + logs.size() + " medicine(s) in 1 click", logs));
        }

        if (id != null && (id.contains(",") || id.contains("&"))) {
            java.util.List<Long> rIds = parseIds(id);
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest.builder()
                    .reminderIds(rIds)
                    .status("DISMISSED")
                    .notes("Dismissed by user (1-click)")
                    .build());
            return ResponseEntity.ok(ApiResponse.success("Reminders dismissed (" + logs.size() + " medicines)"));
        }

        try {
            Long singleId = Long.parseLong(id.trim());
            Optional<Reminder> reminderOpt = reminderRepository.findById(singleId);
            if (reminderOpt.isPresent()) {
                Reminder r = reminderOpt.get();
                if (email == null && r.getMedicine() != null && r.getMedicine().getPrescription() != null && r.getMedicine().getPrescription().getUser() != null) {
                    email = r.getMedicine().getPrescription().getUser().getEmail();
                }
                mediStatusService.logStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.LogRequest.builder()
                        .reminderId(r.getId())
                        .medicineId(r.getMedicine() != null ? r.getMedicine().getId() : null)
                        .medicineName(r.getMedicine() != null ? r.getMedicine().getMedicineName() : null)
                        .slot(r.getSlot())
                        .scheduledTime(r.getReminderTime())
                        .status("DISMISSED")
                        .notes("Dismissed by user")
                        .build());
            }
        } catch (NumberFormatException ignored) {}
        return ResponseEntity.ok(ApiResponse.success("Reminder dismissed."));
    }

    @PostMapping("/{id}/postpone")
    public ResponseEntity<ApiResponse<Object>> postponeReminder(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String id,
            @RequestBody(required = false) com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        if ("batch".equalsIgnoreCase(id) || (request != null && ((request.getMedicineIds() != null && !request.getMedicineIds().isEmpty()) || (request.getReminderIds() != null && !request.getReminderIds().isEmpty())))) {
            if (request == null) request = new com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest();
            request.setStatus("POSTPONED");
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, request);
            return ResponseEntity.ok(ApiResponse.success("Postponed for " + logs.size() + " medicine(s) in 1 click", logs));
        }

        if (id != null && (id.contains(",") || id.contains("&"))) {
            java.util.List<Long> rIds = parseIds(id);
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest.builder()
                    .reminderIds(rIds)
                    .status("POSTPONED")
                    .notes("Postponed by user (1-click)")
                    .build());
            return ResponseEntity.ok(ApiResponse.success("Reminders postponed (" + logs.size() + " medicines)"));
        }

        try {
            Long singleId = Long.parseLong(id.trim());
            Optional<Reminder> reminderOpt = reminderRepository.findById(singleId);
            if (reminderOpt.isPresent()) {
                Reminder r = reminderOpt.get();
                if (email == null && r.getMedicine() != null && r.getMedicine().getPrescription() != null && r.getMedicine().getPrescription().getUser() != null) {
                    email = r.getMedicine().getPrescription().getUser().getEmail();
                }
                mediStatusService.logStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.LogRequest.builder()
                        .reminderId(r.getId())
                        .medicineId(r.getMedicine() != null ? r.getMedicine().getId() : null)
                        .medicineName(r.getMedicine() != null ? r.getMedicine().getMedicineName() : null)
                        .slot(r.getSlot())
                        .scheduledTime(r.getReminderTime())
                        .status("POSTPONED")
                        .notes("Postponed by user")
                        .build());
            }
        } catch (NumberFormatException ignored) {}
        return ResponseEntity.ok(ApiResponse.success("Reminder postponed."));
    }

    @PostMapping("/{id}/others")
    public ResponseEntity<ApiResponse<Object>> othersReminder(
            org.springframework.security.core.Authentication authentication,
            @PathVariable String id,
            @RequestBody(required = false) com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        if ("batch".equalsIgnoreCase(id) || (request != null && ((request.getMedicineIds() != null && !request.getMedicineIds().isEmpty()) || (request.getReminderIds() != null && !request.getReminderIds().isEmpty())))) {
            if (request == null) request = new com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest();
            request.setStatus("OTHERS");
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, request);
            return ResponseEntity.ok(ApiResponse.success("Recorded 'others' reason for " + logs.size() + " medicine(s)", logs));
        }

        if (id != null && (id.contains(",") || id.contains("&"))) {
            java.util.List<Long> rIds = parseIds(id);
            java.util.List<com.brr.medi_pcr.Dto.MediStatusDtos.LogResponse> logs = mediStatusService.logBatchStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.BatchLogRequest.builder()
                    .reminderIds(rIds)
                    .status("OTHERS")
                    .reason(request != null ? request.getReason() : null)
                    .notes(request != null ? request.getNotes() : null)
                    .build());
            return ResponseEntity.ok(ApiResponse.success("Recorded 'others' for " + logs.size() + " medicine(s)", logs));
        }

        try {
            Long singleId = Long.parseLong(id.trim());
            Optional<Reminder> reminderOpt = reminderRepository.findById(singleId);
            if (reminderOpt.isPresent()) {
                Reminder r = reminderOpt.get();
                if (email == null && r.getMedicine() != null && r.getMedicine().getPrescription() != null && r.getMedicine().getPrescription().getUser() != null) {
                    email = r.getMedicine().getPrescription().getUser().getEmail();
                }
                mediStatusService.logStatus(email, com.brr.medi_pcr.Dto.MediStatusDtos.LogRequest.builder()
                        .reminderId(r.getId())
                        .medicineId(r.getMedicine() != null ? r.getMedicine().getId() : null)
                        .medicineName(r.getMedicine() != null ? r.getMedicine().getMedicineName() : null)
                        .slot(r.getSlot())
                        .scheduledTime(r.getReminderTime())
                        .status("OTHERS")
                        .reason(request != null ? request.getReason() : null)
                        .notes(request != null ? request.getNotes() : null)
                        .build());
            }
        } catch (NumberFormatException ignored) {}
        return ResponseEntity.ok(ApiResponse.success("Recorded 'others' status."));
    }

    private java.util.List<Long> parseIds(String idStr) {
        java.util.List<Long> ids = new java.util.ArrayList<>();
        if (idStr == null) return ids;
        for (String part : idStr.split("[,&]")) {
            try {
                if (!part.trim().isEmpty()) {
                    ids.add(Long.parseLong(part.trim()));
                }
            } catch (NumberFormatException ignored) {}
        }
        return ids;
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<ApiResponse<String>> updateFcmToken(
            org.springframework.security.core.Authentication authentication,
            @RequestBody java.util.Map<String, Object> body) {
        String rawToken = body.get("fcmToken") != null ? String.valueOf(body.get("fcmToken")) : null;
        if (rawToken == null && body.get("token") != null) {
            rawToken = String.valueOf(body.get("token"));
        }
        final String finalToken = rawToken;

        if (finalToken != null && !finalToken.isBlank()) {
            String email = authentication != null ? authentication.getName() : null;
            if (email == null && body.get("userEmail") != null) {
                email = String.valueOf(body.get("userEmail"));
            }

            com.brr.medi_pcr.Entity.User targetUser = null;
            if (email != null && !email.isBlank()) {
                targetUser = userRepository.findByEmail(email.trim()).orElse(null);
            }
            if (targetUser == null && body.get("userId") != null) {
                try {
                    targetUser = userRepository.findById(Long.parseLong(String.valueOf(body.get("userId")))).orElse(null);
                } catch (Exception ignored) {}
            }
            if (targetUser != null) {
                targetUser.setFcmToken(finalToken.trim());
                userRepository.save(targetUser);
                org.slf4j.LoggerFactory.getLogger(ReminderController.class)
                        .info("✅ FCM Token registered for {} (role: {}): {}", targetUser.getEmail(), targetUser.getRole(), finalToken.substring(0, Math.min(20, finalToken.length())) + "...");
            } else {
                org.slf4j.LoggerFactory.getLogger(ReminderController.class)
                        .info("ℹ️ FCM Token received from unauthenticated device, awaiting user/admin login: {}", finalToken.substring(0, Math.min(20, finalToken.length())) + "...");
            }
        }
        return ResponseEntity.ok(ApiResponse.success("FCM Token recorded: " + finalToken));
    }

    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/trigger-test")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> triggerTest(
            @RequestParam(required = false) String time,
            @RequestParam(defaultValue = "false") boolean forceAll,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        java.time.LocalTime targetTime = time != null
                ? java.time.LocalTime.parse(time)
                : java.time.LocalTime.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES);

        java.util.List<com.brr.medi_pcr.Entity.Medicine> active = medicineRepository.findByStatus("ACTIVE");
        java.util.List<com.brr.medi_pcr.Entity.Medicine> due = forceAll
                ? active
                : active.stream().filter(m -> {
                    boolean mDue = false;
                    if (m.isMorning() && m.getMorningTime() != null) mDue |= m.getMorningTime().equals(targetTime);
                    if (m.isAfternoon() && m.getAfternoonTime() != null) mDue |= m.getAfternoonTime().equals(targetTime);
                    if (m.isEvening() && m.getEveningTime() != null) mDue |= m.getEveningTime().equals(targetTime);
                    if (m.isNight() && m.getNightTime() != null) mDue |= m.getNightTime().equals(targetTime);
                    return mDue;
                }).collect(java.util.stream.Collectors.toList());

        // Find all active tokens across registered users
        java.util.List<String> activeTokens = userRepository.findAll().stream()
                .map(com.brr.medi_pcr.Entity.User::getFcmToken)
                .filter(t -> t != null && !t.isBlank())
                .flatMap(t -> java.util.Arrays.stream(t.split(",")))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        // Prioritize explicit fcmToken sent by client in request body
        if (body != null && body.get("fcmToken") != null) {
            String explicitToken = String.valueOf(body.get("fcmToken")).trim();
            if (!explicitToken.isBlank() && !activeTokens.contains(explicitToken)) {
                activeTokens.add(0, explicitToken);
            }
        }

        // Always guarantee test medicines are present for dispatch
        if (due.isEmpty()) {
            if (!active.isEmpty()) {
                due = active;
            } else {
                com.brr.medi_pcr.Entity.Medicine testMed = new com.brr.medi_pcr.Entity.Medicine();
                testMed.setId(9999L);
                testMed.setMedicineName("Stamlo 5mg & Arvant 10mg (Test)");
                testMed.setFoodInstruction("AFTER_FOOD");
                due = java.util.Collections.singletonList(testMed);
            }
        }

        java.util.Map<String, Object> res = new java.util.HashMap<>();
        res.put("targetTime", targetTime.toString());
        res.put("totalActive", active.size());
        res.put("matchedDue", due.size());
        res.put("fcmTokenAvailable", !activeTokens.isEmpty());
        res.put("registeredDeviceCount", activeTokens.size());

        if (!due.isEmpty() && !activeTokens.isEmpty()) {
            java.util.List<String> allResults = new java.util.ArrayList<>();
            java.util.List<String> deadTokens = new java.util.ArrayList<>();
            for (String singleToken : activeTokens) {
                java.util.List<String> results = fcmNotificationService.sendGroupedReminders(due, singleToken, targetTime);
                allResults.addAll(results);
                for (String r : results) {
                    if (r != null && (r.contains("NotRegistered") || r.contains("Requested entity was not found"))) {
                        deadTokens.add(singleToken);
                        break;
                    }
                }
            }

            // Purge dead tokens from users
            if (!deadTokens.isEmpty()) {
                for (com.brr.medi_pcr.Entity.User u : userRepository.findAll()) {
                    if (u.getFcmToken() != null) {
                        java.util.List<String> valid = java.util.Arrays.stream(u.getFcmToken().split(","))
                                .map(String::trim)
                                .filter(t -> !t.isEmpty() && !deadTokens.contains(t))
                                .collect(java.util.stream.Collectors.toList());
                        String newTokens = String.join(",", valid);
                        if (!newTokens.equals(u.getFcmToken())) {
                            u.setFcmToken(newTokens.isEmpty() ? null : newTokens);
                            userRepository.save(u);
                        }
                    }
                }
            }

            res.put("dispatched", true);
            res.put("firebaseResult", allResults);
            res.put("medicines", due.stream().map(com.brr.medi_pcr.Entity.Medicine::getMedicineName).collect(java.util.stream.Collectors.toList()));
        } else {
            res.put("dispatched", false);
            if (activeTokens.isEmpty()) res.put("error", "No user has registered an FCM token yet");
            else res.put("error", "No medicines matched time " + targetTime);
        }

        return ResponseEntity.ok(ApiResponse.success("Trigger test executed", res));
    }

    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/reset-status")
    public ResponseEntity<ApiResponse<String>> resetMedicinesStatus() {
        java.util.List<com.brr.medi_pcr.Entity.Medicine> active = medicineRepository.findByStatus("ACTIVE");
        for (com.brr.medi_pcr.Entity.Medicine m : active) {
            m.setMediStatus("PENDING");
            m.setMorningStatus("PENDING");
            m.setAfternoonStatus("PENDING");
            m.setEveningStatus("PENDING");
            m.setNightStatus("PENDING");
            if (m.getReminders() != null) {
                for (com.brr.medi_pcr.Entity.Reminder r : m.getReminders()) {
                    r.setMediStatus("PENDING");
                    r.setLastPostponedDate(null);
                    r.setLastActionDate(null);
                    r.setSnoozeCount(0);
                    if (r.getOriginalTime() != null) {
                        r.setReminderTime(r.getOriginalTime());
                    }
                    reminderRepository.save(r);
                }
            }
            medicineRepository.save(m);
        }
        return ResponseEntity.ok(ApiResponse.success("Reset " + active.size() + " active medicines to PENDING"));
    }

    @PostMapping("/schedule-next-minute")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> scheduleForNextMinute() {
        java.time.LocalTime nextMin = java.time.LocalTime.now().plusMinutes(1).truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        java.util.List<com.brr.medi_pcr.Entity.Medicine> active = medicineRepository.findByStatus("ACTIVE");
        if (active.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No active medicines found"));
        }
        com.brr.medi_pcr.Entity.Medicine med = active.get(0);
        med.setMediStatus("PENDING");
        med.setMorning(true);
        med.setMorningTime(nextMin);
        med.setMorningStatus("PENDING");
        medicineRepository.save(med);

        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("medicineName", med.getMedicineName());
        map.put("scheduledTime", nextMin.toString());
        map.put("note", "Reminder will trigger automatically when server time reaches " + nextMin);
        return ResponseEntity.ok(ApiResponse.success("Scheduled " + med.getMedicineName() + " for " + nextMin, map));
    }
}
