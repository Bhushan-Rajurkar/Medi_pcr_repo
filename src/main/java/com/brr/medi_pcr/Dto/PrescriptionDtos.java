package com.brr.medi_pcr.Dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class PrescriptionDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrescriptionResponse {
        private Long id;
        private String externalPrescriptionId;
        private LocalDate uploadDate;
        private LocalDate prescriptionDate;
        private DoctorResponse doctor;
        private PatientResponse patient;
        @Builder.Default
        private List<MedicineResponse> medicines = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DoctorResponse {
        private Long id;
        private String clinicName;
        private String doctorNames;
        private String address;
        private String contactNumber;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PatientResponse {
        private Long id;
        private String name;
        private String age;
        private String gender;
        private String allergies;
        private String bp;
        private String heartRate;
        private String weight;
        private String fcmToken;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicineResponse {
        private Long id;
        private Long prescriptionId;
        private String medicineName;
        private String status;
        private String mediStatus;
        private String frequency;
        private boolean morning;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime morningTime;
        private String morningStatus;

        private boolean afternoon;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime afternoonTime;
        private String afternoonStatus;

        private boolean evening;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime eveningTime;
        private String eveningStatus;

        private boolean night;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime nightTime;
        private String nightStatus;

        private String foodInstruction;
        private Integer totalQuantity;
        private LocalDate startDate;
        private LocalDate endDate;
        @Builder.Default
        private List<ReminderResponse> reminders = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReminderResponse {
        private Long id;
        private Long medicineId;
        private String medicineName;
        private String slot;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime reminderTime;
        private String foodInstruction;
        private String mediStatus;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateMedicineStatusRequest {
        private String status; // e.g. "ACTIVE", "COMPLETED", "STOPPED"
    }
}
