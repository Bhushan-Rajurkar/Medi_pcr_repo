package com.brr.medi_pcr.Dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

public class MedicineDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualMedicineRequest {

        @NotBlank(message = "Medicine name is required")
        private String medicineName;

        private Long prescriptionId;
        private String frequency;
        private String mediStatus;     // e.g. "Tablet", "Capsule", "Syrup", "Injection", "Drops"
        private String status;         // "ACTIVE", "COMPLETED", "STOPPED"
        private String foodInstruction;// "BEFORE_FOOD", "AFTER_FOOD", "WITH_FOOD"
        private Integer totalQuantity;
        private LocalDate startDate;
        private LocalDate endDate;

        private boolean morning;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime morningTime;

        private boolean afternoon;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime afternoonTime;

        private boolean evening;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime eveningTime;

        private boolean night;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime nightTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusUpdateRequest {
        @NotBlank(message = "Status is required")
        private String status;
    }
}
