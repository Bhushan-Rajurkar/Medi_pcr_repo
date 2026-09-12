package com.brr.medi_pcr.Dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class PrescriptionRequestWrapper {
    private PrescriptionPayload prescription;

    @Data
    public static class PrescriptionPayload {
        private String prescriptionId;
        private LocalDate uploadDate;
        private LocalDate date;
        private DoctorDto doctor;
        private PatientDto patient;
        private List<MedicineDto> medicines;
    }

    @Data
    public static class DoctorDto {
        private String clinicName;
        private List<String> doctorNames;
        private String address;
        private String contactNumber;
    }

    @Data
    public static class PatientDto {
        private String name;
        private String age;
        private String gender;

        @JsonProperty("Allergies")
        @JsonAlias({"Allergies ", "allergies", "Allergy", "allergy"})
        private String allergies;

        @JsonProperty("BP")
        @JsonAlias({"bp", "Bp", "BloodPressure", "bloodPressure"})
        private String bp;

        @JsonProperty("HeartRate")
        @JsonAlias({"heartRate", "Heart Rate", "heart_rate"})
        private String heartRate;

        @JsonProperty("Weight")
        @JsonAlias({" Weight", "weight", "Weight (kg)", "weightKg"})
        private String weight;
    }

    @Data
    public static class MedicineDto {
        private Long id;
        private String medicineName;
        private String status;
        private String mediStatus;
        private String frequency;
        private boolean morning;
        private LocalTime morningTime; // Optional manual override
        private boolean afternoon;
        private LocalTime afternoonTime;
        private boolean evening;
        private LocalTime eveningTime;
        private boolean night;
        private LocalTime nightTime;
        private String foodInstruction;
        private Integer totalQuantity;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}