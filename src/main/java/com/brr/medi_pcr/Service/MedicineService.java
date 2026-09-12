package com.brr.medi_pcr.Service;

import com.brr.medi_pcr.Dto.MedicineDtos;
import com.brr.medi_pcr.Dto.PrescriptionDtos;
import com.brr.medi_pcr.Entity.Medicine;
import com.brr.medi_pcr.Entity.PrescriptionData;
import com.brr.medi_pcr.Entity.Reminder;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.MediStatusLogRepository;
import com.brr.medi_pcr.Repository.MedicineRepository;
import com.brr.medi_pcr.Repository.PrescriptionRepository;
import com.brr.medi_pcr.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final UserRepository userRepository;
    private final MediStatusLogRepository mediStatusLogRepository;

    private static final LocalTime DEFAULT_MORNING = LocalTime.of(9, 0);
    private static final LocalTime DEFAULT_AFTERNOON = LocalTime.of(14, 0);
    private static final LocalTime DEFAULT_EVENING = LocalTime.of(19, 0);
    private static final LocalTime DEFAULT_NIGHT = LocalTime.of(22, 0);

    /**
     * Add a medicine manually for the authenticated user with customizable timings.
     */
    @Transactional
    public PrescriptionDtos.MedicineResponse addManualMedicine(String userEmail, MedicineDtos.ManualMedicineRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userEmail));

        PrescriptionData prescription;
        if (request.getPrescriptionId() != null) {
            prescription = prescriptionRepository.findByIdAndUserId(request.getPrescriptionId(), user.getId())
                    .orElseThrow(() -> new RuntimeException("Prescription not found with ID: " + request.getPrescriptionId()));
        } else {
            prescription = prescriptionRepository.findFirstByUserIdAndExternalPrescriptionId(user.getId(), "MANUAL_ENTRY")
                    .orElseGet(() -> {
                        PrescriptionData manual = PrescriptionData.builder()
                                .user(user)
                                .externalPrescriptionId("MANUAL_ENTRY")
                                .uploadDate(LocalDate.now())
                                .prescriptionDate(LocalDate.now())
                                .build();
                        return prescriptionRepository.save(manual);
                    });
        }

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();
        LocalDate endDate = request.getEndDate() != null ? request.getEndDate() : startDate.plusDays(14);

        Medicine medicine = Medicine.builder()
                .prescription(prescription)
                .medicineName(request.getMedicineName().trim())
                .frequency(request.getFrequency() != null ? request.getFrequency().trim() : "1-0-1")
                .mediStatus(request.getMediStatus() != null ? request.getMediStatus().trim() : "Tablet")
                .status(request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE")
                .foodInstruction(request.getFoodInstruction() != null ? request.getFoodInstruction().trim() : "AFTER_FOOD")
                .totalQuantity(request.getTotalQuantity())
                .startDate(startDate)
                .endDate(endDate)
                .morning(request.isMorning())
                .morningTime(request.isMorning() ? (request.getMorningTime() != null ? request.getMorningTime() : DEFAULT_MORNING) : null)
                .afternoon(request.isAfternoon())
                .afternoonTime(request.isAfternoon() ? (request.getAfternoonTime() != null ? request.getAfternoonTime() : DEFAULT_AFTERNOON) : null)
                .evening(request.isEvening())
                .eveningTime(request.isEvening() ? (request.getEveningTime() != null ? request.getEveningTime() : DEFAULT_EVENING) : null)
                .night(request.isNight())
                .nightTime(request.isNight() ? (request.getNightTime() != null ? request.getNightTime() : DEFAULT_NIGHT) : null)
                .reminders(new ArrayList<>())
                .build();

        buildReminders(medicine);

        Medicine saved = medicineRepository.save(medicine);
        log.info("Manual medicine '{}' created successfully for user {}", saved.getMedicineName(), userEmail);
        return mapToMedicineResponse(saved);
    }

    /**
     * Update an existing medicine's name, timings, frequency, instructions, etc.
     */
    @Transactional
    public PrescriptionDtos.MedicineResponse updateMedicine(String userEmail, Long medicineId, MedicineDtos.ManualMedicineRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userEmail));

        Medicine medicine = medicineRepository.findByIdAndPrescriptionUserId(medicineId, user.getId())
                .orElseThrow(() -> new RuntimeException("Medicine not found with ID: " + medicineId));

        if (request.getMedicineName() != null && !request.getMedicineName().trim().isEmpty()) {
            medicine.setMedicineName(request.getMedicineName().trim());
        }
        if (request.getFrequency() != null) {
            medicine.setFrequency(request.getFrequency().trim());
        }
        if (request.getMediStatus() != null) {
            medicine.setMediStatus(request.getMediStatus().trim());
        }
        if (request.getStatus() != null) {
            medicine.setStatus(request.getStatus().trim().toUpperCase());
        }
        if (request.getFoodInstruction() != null) {
            medicine.setFoodInstruction(request.getFoodInstruction().trim());
        }
        if (request.getTotalQuantity() != null) {
            medicine.setTotalQuantity(request.getTotalQuantity());
        }
        if (request.getStartDate() != null) {
            medicine.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            medicine.setEndDate(request.getEndDate());
        }

        // Update Timings
        medicine.setMorning(request.isMorning());
        medicine.setMorningTime(request.isMorning() ? (request.getMorningTime() != null ? request.getMorningTime() : DEFAULT_MORNING) : null);

        medicine.setAfternoon(request.isAfternoon());
        medicine.setAfternoonTime(request.isAfternoon() ? (request.getAfternoonTime() != null ? request.getAfternoonTime() : DEFAULT_AFTERNOON) : null);

        medicine.setEvening(request.isEvening());
        medicine.setEveningTime(request.isEvening() ? (request.getEveningTime() != null ? request.getEveningTime() : DEFAULT_EVENING) : null);

        medicine.setNight(request.isNight());
        medicine.setNightTime(request.isNight() ? (request.getNightTime() != null ? request.getNightTime() : DEFAULT_NIGHT) : null);

        // Reset slot statuses to PENDING so newly configured/edited timings are active
        medicine.setMorningStatus("PENDING");
        medicine.setAfternoonStatus("PENDING");
        medicine.setEveningStatus("PENDING");
        medicine.setNightStatus("PENDING");

        // Rebuild Reminders safely without foreign key violations
        if (medicine.getReminders() != null && !medicine.getReminders().isEmpty()) {
            List<Long> oldReminderIds = medicine.getReminders().stream()
                    .map(Reminder::getId)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
            if (!oldReminderIds.isEmpty()) {
                mediStatusLogRepository.disassociateReminders(oldReminderIds);
            }
            medicine.getReminders().clear();
        }
        buildReminders(medicine);

        Medicine saved = medicineRepository.save(medicine);
        log.info("Medicine ID {} updated successfully by user {}", medicineId, userEmail);
        return mapToMedicineResponse(saved);
    }

    /**
     * Delete a medicine.
     */
    @Transactional
    public void deleteMedicine(String userEmail, Long medicineId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userEmail));

        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new RuntimeException("Medicine not found with ID: " + medicineId));

        if (medicine.getPrescription() != null && medicine.getPrescription().getUser() != null) {
            if (!medicine.getPrescription().getUser().getId().equals(user.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("You do not have permission to delete this medicine.");
            }
        }

        // 1. Disassociate and delete associated medi_status_logs for this medicine
        mediStatusLogRepository.disassociateMedicine(medicine);
        mediStatusLogRepository.deleteByMedicine(medicine);

        // 2. Delete medicine (which cascades to its reminders)
        medicineRepository.delete(medicine);
        log.info("Medicine ID {} deleted successfully by user {}", medicineId, userEmail);
    }

    /**
     * Quick status update for a medicine (e.g. ACTIVE -> COMPLETED -> STOPPED).
     */
    @Transactional
    public PrescriptionDtos.MedicineResponse updateStatus(String userEmail, Long medicineId, String newStatus) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userEmail));

        Medicine medicine = medicineRepository.findByIdAndPrescriptionUserId(medicineId, user.getId())
                .orElseThrow(() -> new RuntimeException("Medicine not found with ID: " + medicineId));

        medicine.setStatus(newStatus.toUpperCase());
        Medicine saved = medicineRepository.save(medicine);
        return mapToMedicineResponse(saved);
    }

    /**
     * Get all medicines for user with optional status filter.
     */
    @Transactional(readOnly = true)
    public List<PrescriptionDtos.MedicineResponse> getUserMedicines(String userEmail, String status) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userEmail));

        List<Medicine> list;
        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status.trim())) {
            list = medicineRepository.findByPrescriptionUserIdAndStatusIgnoreCase(user.getId(), status.trim());
        } else {
            list = medicineRepository.findByPrescriptionUserId(user.getId());
        }

        return list.stream().map(this::mapToMedicineResponse).collect(Collectors.toList());
    }

    /**
     * Get single medicine by id.
     */
    @Transactional(readOnly = true)
    public PrescriptionDtos.MedicineResponse getMedicineById(String userEmail, Long medicineId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userEmail));

        Medicine medicine = medicineRepository.findByIdAndPrescriptionUserId(medicineId, user.getId())
                .orElseThrow(() -> new RuntimeException("Medicine not found with ID: " + medicineId));

        return mapToMedicineResponse(medicine);
    }

    private void buildReminders(Medicine medicine) {
        if (medicine.isMorning() && medicine.getMorningTime() != null) {
            medicine.getReminders().add(createReminder(medicine, "MORNING", medicine.getMorningTime()));
        }
        if (medicine.isAfternoon() && medicine.getAfternoonTime() != null) {
            medicine.getReminders().add(createReminder(medicine, "AFTERNOON", medicine.getAfternoonTime()));
        }
        if (medicine.isEvening() && medicine.getEveningTime() != null) {
            medicine.getReminders().add(createReminder(medicine, "EVENING", medicine.getEveningTime()));
        }
        if (medicine.isNight() && medicine.getNightTime() != null) {
            medicine.getReminders().add(createReminder(medicine, "NIGHT", medicine.getNightTime()));
        }
    }

    private Reminder createReminder(Medicine medicine, String slot, LocalTime time) {
        return Reminder.builder()
                .medicine(medicine)
                .slot(slot)
                .reminderTime(time)
                .mediStatus("PENDING")
                .build();
    }

    private PrescriptionDtos.MedicineResponse mapToMedicineResponse(Medicine m) {
        List<PrescriptionDtos.ReminderResponse> reminderResponses = Collections.emptyList();
        if (m.getReminders() != null) {
            reminderResponses = m.getReminders().stream()
                    .map(r -> PrescriptionDtos.ReminderResponse.builder()
                            .id(r.getId())
                            .medicineId(m.getId())
                            .medicineName(m.getMedicineName())
                            .slot(r.getSlot())
                            .reminderTime(r.getReminderTime())
                            .foodInstruction(m.getFoodInstruction())
                            .mediStatus(r.getMediStatus() != null ? r.getMediStatus() : "PENDING")
                            .build())
                    .collect(Collectors.toList());
        }

        Long prescId = m.getPrescription() != null ? m.getPrescription().getId() : null;

        String adherenceStatus = m.getMediStatus();
        if (adherenceStatus == null || "ACTIVE".equalsIgnoreCase(adherenceStatus) || "INACTIVE".equalsIgnoreCase(adherenceStatus) || "COMPLETE".equalsIgnoreCase(adherenceStatus)) {
            com.brr.medi_pcr.Entity.MediStatusLog latestLog = mediStatusLogRepository.findTopByMedicineOrderByActionTimeDesc(m).orElse(null);
            if (latestLog != null && latestLog.getStatus() != null) {
                adherenceStatus = latestLog.getStatus();
            } else {
                adherenceStatus = "PENDING";
            }
        }

        return PrescriptionDtos.MedicineResponse.builder()
                .id(m.getId())
                .prescriptionId(prescId)
                .medicineName(m.getMedicineName())
                .status(m.getStatus())
                .mediStatus(adherenceStatus)
                .frequency(m.getFrequency())
                .morning(m.isMorning())
                .morningTime(m.getMorningTime())
                .morningStatus(m.getMorningStatus() != null ? m.getMorningStatus() : "PENDING")
                .afternoon(m.isAfternoon())
                .afternoonTime(m.getAfternoonTime())
                .afternoonStatus(m.getAfternoonStatus() != null ? m.getAfternoonStatus() : "PENDING")
                .evening(m.isEvening())
                .eveningTime(m.getEveningTime())
                .eveningStatus(m.getEveningStatus() != null ? m.getEveningStatus() : "PENDING")
                .night(m.isNight())
                .nightTime(m.getNightTime())
                .nightStatus(m.getNightStatus() != null ? m.getNightStatus() : "PENDING")
                .foodInstruction(m.getFoodInstruction())
                .totalQuantity(m.getTotalQuantity())
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .reminders(reminderResponses)
                .build();
    }
}
