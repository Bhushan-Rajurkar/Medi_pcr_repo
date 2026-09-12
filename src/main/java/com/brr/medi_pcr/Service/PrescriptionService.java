package com.brr.medi_pcr.Service;

import com.brr.medi_pcr.Dto.PrescriptionDtos;
import com.brr.medi_pcr.Dto.PrescriptionRequestWrapper;
import com.brr.medi_pcr.Entity.*;
import com.brr.medi_pcr.Repository.MedicineRepository;
import com.brr.medi_pcr.Repository.PrescriptionRepository;
import com.brr.medi_pcr.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
public class PrescriptionService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.brr.medi_pcr.Repository.MediStatusLogRepository mediStatusLogRepository;

    // Standard Default Times
    private static final LocalTime DEFAULT_MORNING = LocalTime.of(10, 0);
    private static final LocalTime DEFAULT_AFTERNOON = LocalTime.of(14, 0);
    private static final LocalTime DEFAULT_EVENING = LocalTime.of(20, 0);
    private static final LocalTime DEFAULT_NIGHT = LocalTime.of(22, 0);

    @Transactional
    public PrescriptionDtos.PrescriptionResponse savePrescription(String userEmail, PrescriptionRequestWrapper wrapper) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

        if (wrapper == null || wrapper.getPrescription() == null) {
            throw new IllegalArgumentException("Prescription data is missing.");
        }

        PrescriptionRequestWrapper.PrescriptionPayload payload = wrapper.getPrescription();

        LocalDate uploadDate = payload.getUploadDate() != null ? payload.getUploadDate() : LocalDate.now();
        LocalDate prescriptionDate = payload.getDate() != null ? payload.getDate() : LocalDate.now();

        PrescriptionData prescription = PrescriptionData.builder()
                .externalPrescriptionId(payload.getPrescriptionId())
                .uploadDate(uploadDate)
                .prescriptionDate(prescriptionDate)
                .user(user)
                .build();

        // 1. Map Doctor
        if (payload.getDoctor() != null) {
            String doctorNamesStr = "";
            if (payload.getDoctor().getDoctorNames() != null && !payload.getDoctor().getDoctorNames().isEmpty()) {
                doctorNamesStr = String.join(", ", payload.getDoctor().getDoctorNames());
            }
            DoctorDetails doctor = DoctorDetails.builder()
                    .clinicName(payload.getDoctor().getClinicName())
                    .doctorNames(doctorNamesStr)
                    .address(payload.getDoctor().getAddress())
                    .contactNumber(payload.getDoctor().getContactNumber())
                    .prescription(prescription)
                    .build();
            prescription.setDoctor(doctor);
        }

        // 2. Map Patient
        if (payload.getPatient() != null) {
            PatientDetails patient = PatientDetails.builder()
                    .name(payload.getPatient().getName())
                    .age(payload.getPatient().getAge())
                    .gender(payload.getPatient().getGender())
                    .allergies(payload.getPatient().getAllergies())
                    .bp(payload.getPatient().getBp())
                    .heartRate(payload.getPatient().getHeartRate())
                    .weight(payload.getPatient().getWeight())
                    .prescription(prescription)
                    .build();
            prescription.setPatient(patient);
        }

        // 3. Map Medicines & Generate Reminders with offset for BEFORE_FOOD
        List<Medicine> medicines = new ArrayList<>();
        if (payload.getMedicines() != null) {
            for (PrescriptionRequestWrapper.MedicineDto mDto : payload.getMedicines()) {
                String status = (mDto.getStatus() != null && !mDto.getStatus().isBlank())
                        ? mDto.getStatus().toUpperCase()
                        : "ACTIVE";

                Medicine medicine = Medicine.builder()
                        .medicineName(mDto.getMedicineName())
                        .status(status)
                        .mediStatus(mDto.getMediStatus())
                        .frequency(mDto.getFrequency())
                        .foodInstruction(mDto.getFoodInstruction())
                        .totalQuantity(mDto.getTotalQuantity())
                        .startDate(mDto.getStartDate() != null ? mDto.getStartDate() : LocalDate.now())
                        .endDate(mDto.getEndDate())
                        .morning(mDto.isMorning())
                        .morningTime(mDto.getMorningTime())
                        .afternoon(mDto.isAfternoon())
                        .afternoonTime(mDto.getAfternoonTime())
                        .evening(mDto.isEvening())
                        .eveningTime(mDto.getEveningTime())
                        .night(mDto.isNight())
                        .nightTime(mDto.getNightTime())
                        .prescription(prescription)
                        .build();

                int offsetMinutes = "BEFORE_FOOD".equalsIgnoreCase(mDto.getFoodInstruction()) ? -60 : 0;
                List<Reminder> reminders = new ArrayList<>();

                if (mDto.isMorning()) {
                    LocalTime base = mDto.getMorningTime() != null ? mDto.getMorningTime() : DEFAULT_MORNING;
                    reminders.add(createReminder(medicine, "MORNING", base.plusMinutes(offsetMinutes)));
                }
                if (mDto.isAfternoon()) {
                    LocalTime base = mDto.getAfternoonTime() != null ? mDto.getAfternoonTime() : DEFAULT_AFTERNOON;
                    reminders.add(createReminder(medicine, "AFTERNOON", base.plusMinutes(offsetMinutes)));
                }
                if (mDto.isEvening()) {
                    LocalTime base = mDto.getEveningTime() != null ? mDto.getEveningTime() : DEFAULT_EVENING;
                    reminders.add(createReminder(medicine, "EVENING", base.plusMinutes(offsetMinutes)));
                }
                if (mDto.isNight()) {
                    LocalTime base = mDto.getNightTime() != null ? mDto.getNightTime() : DEFAULT_NIGHT;
                    reminders.add(createReminder(medicine, "NIGHT", base.plusMinutes(offsetMinutes)));
                }

                medicine.setReminders(reminders);
                medicines.add(medicine);
            }
        }
        prescription.setMedicines(medicines);

        PrescriptionData saved = prescriptionRepository.save(prescription);
        return mapToPrescriptionResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionDtos.PrescriptionResponse> getUserPrescriptions(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

        return prescriptionRepository.findByUserIdOrderByUploadDateDesc(user.getId())
                .stream()
                .map(this::mapToPrescriptionResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PrescriptionDtos.PrescriptionResponse getPrescriptionById(String userEmail, Long id) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

        PrescriptionData prescription = prescriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Prescription not found with ID: " + id));

        return mapToPrescriptionResponse(prescription);
    }

    @Transactional
    public void deletePrescription(String userEmail, Long id) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

        PrescriptionData prescription = prescriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Prescription not found with ID: " + id));

        // 1. Delete all associated medi_status_logs for all medicines and reminders in this prescription
        if (prescription.getMedicines() != null && !prescription.getMedicines().isEmpty()) {
            List<Long> medicineIds = new ArrayList<>();
            for (Medicine med : prescription.getMedicines()) {
                medicineIds.add(med.getId());
            }

            if (!medicineIds.isEmpty()) {
                mediStatusLogRepository.deleteByMedicineIds(medicineIds);
            }
        }

        // 2. Delete prescription (cascades to doctor, patient, medicines, reminders)
        prescriptionRepository.delete(prescription);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionDtos.MedicineResponse> getUserMedicines(String userEmail, String status) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

        List<Medicine> medicines;
        if (status != null && !status.trim().isEmpty()) {
            medicines = medicineRepository.findByPrescriptionUserIdAndStatusIgnoreCase(user.getId(), status.trim());
        } else {
            medicines = medicineRepository.findByPrescriptionUserId(user.getId());
        }

        return medicines.stream()
                .map(this::mapToMedicineResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PrescriptionDtos.MedicineResponse updateMedicineStatus(String userEmail, Long medicineId, String newStatus) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

        Medicine medicine = medicineRepository.findByIdAndPrescriptionUserId(medicineId, user.getId())
                .orElseThrow(() -> new RuntimeException("Medicine not found with ID: " + medicineId));

        if (newStatus == null || newStatus.isBlank()) {
            throw new IllegalArgumentException("Status cannot be empty.");
        }

        medicine.setStatus(newStatus.trim().toUpperCase());
        Medicine saved = medicineRepository.save(medicine);
        return mapToMedicineResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionDtos.ReminderResponse> getTodayReminders(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

        LocalDate today = LocalDate.now();
        List<Medicine> activeMedicines = medicineRepository.findByPrescriptionUserIdAndStatusIgnoreCase(user.getId(), "ACTIVE");

        List<PrescriptionDtos.ReminderResponse> todayReminders = new ArrayList<>();

        for (Medicine med : activeMedicines) {
            // Check date validity
            if (med.getStartDate() != null && today.isBefore(med.getStartDate())) continue;
            if (med.getEndDate() != null && today.isAfter(med.getEndDate())) continue;

            if (med.getReminders() != null) {
                for (Reminder r : med.getReminders()) {
                    todayReminders.add(PrescriptionDtos.ReminderResponse.builder()
                            .id(r.getId())
                            .medicineId(med.getId())
                            .medicineName(med.getMedicineName())
                            .slot(r.getSlot())
                            .reminderTime(r.getReminderTime())
                            .foodInstruction(med.getFoodInstruction())
                            .mediStatus(r.getMediStatus() != null ? r.getMediStatus() : "PENDING")
                            .build());
                }
            }
        }

        return todayReminders;
    }

    private Reminder createReminder(Medicine medicine, String slot, LocalTime time) {
        return Reminder.builder()
                .slot(slot)
                .reminderTime(time.withSecond(0).withNano(0))
                .medicine(medicine)
                .mediStatus("PENDING")
                .build();
    }

    private PrescriptionDtos.PrescriptionResponse mapToPrescriptionResponse(PrescriptionData p) {
        PrescriptionDtos.DoctorResponse docResp = null;
        if (p.getDoctor() != null) {
            docResp = PrescriptionDtos.DoctorResponse.builder()
                    .id(p.getDoctor().getId())
                    .doctorNames(p.getDoctor().getDoctorNames())
                    .clinicName(p.getDoctor().getClinicName())
                    .address(p.getDoctor().getAddress())
                    .contactNumber(p.getDoctor().getContactNumber())
                    .build();
        }

        PrescriptionDtos.PatientResponse patientResp = null;
        if (p.getPatient() != null) {
            patientResp = PrescriptionDtos.PatientResponse.builder()
                    .id(p.getPatient().getId())
                    .name(p.getPatient().getName())
                    .age(p.getPatient().getAge())
                    .gender(p.getPatient().getGender())
                    .allergies(p.getPatient().getAllergies())
                    .bp(p.getPatient().getBp())
                    .heartRate(p.getPatient().getHeartRate())
                    .weight(p.getPatient().getWeight())
                    .fcmToken(p.getPatient().getFcmToken())
                    .build();
        }

        List<PrescriptionDtos.MedicineResponse> medResponses = Collections.emptyList();
        if (p.getMedicines() != null) {
            medResponses = p.getMedicines().stream()
                    .map(this::mapToMedicineResponse)
                    .collect(Collectors.toList());
        }

        return PrescriptionDtos.PrescriptionResponse.builder()
                .id(p.getId())
                .externalPrescriptionId(p.getExternalPrescriptionId())
                .uploadDate(p.getUploadDate())
                .prescriptionDate(p.getPrescriptionDate())
                .doctor(docResp)
                .patient(patientResp)
                .medicines(medResponses)
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