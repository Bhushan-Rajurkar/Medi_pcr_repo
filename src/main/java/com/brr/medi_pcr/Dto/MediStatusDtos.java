package com.brr.medi_pcr.Dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class MediStatusDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LogRequest {
        // TAKEN, SNOOZED, DISMISSED, POSTPONED, OTHERS
        private String status;

        private Long userId;
        private String userEmail;
        private Long medicineId;
        private Long reminderId;
        private String medicineName;
        private String slot; // MORNING, AFTERNOON, EVENING, NIGHT

        @JsonFormat(pattern = "HH:mm")
        private LocalTime scheduledTime;

        private String reason;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BatchLogRequest {
        // TAKEN, SNOOZED, DISMISSED, POSTPONED, OTHERS
        private String status;
        private Long userId;
        private String userEmail;
        private List<Long> medicineIds;
        private List<Long> reminderIds;
        private String slot; // MORNING, AFTERNOON, EVENING, NIGHT

        @JsonFormat(pattern = "HH:mm")
        private LocalTime scheduledTime;

        private String reason;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LogResponse {
        private Long id;
        private String status;
        private String medicineName;
        private String slot;

        @JsonFormat(pattern = "HH:mm")
        private LocalTime scheduledTime;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate logDate;

        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime actionTime;

        private String reason;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyAdherence {
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate date;
        private long taken;
        private long snoozed;
        private long dismissed;
        private long postponed;
        private long others;
        private long total;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReportResponse {
        private long totalEvents;
        private long takenCount;
        private long snoozedCount;
        private long dismissedCount;
        private long postponedCount;
        private long othersCount;
        private double adherenceRate; // e.g. 85.5%
        private List<DailyAdherence> dailyBreakdown;
        private List<LogResponse> recentLogs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TabularLogItem {
        private Long id;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate date;
        @JsonFormat(pattern = "HH:mm:ss")
        private LocalTime time;
        private String medicineName;
        private String slot;
        @JsonFormat(pattern = "HH:mm")
        private LocalTime scheduledTime;
        private String category; // TAKEN, SNOOZED, DISMISSED, POSTPONED, OTHERS
        private String reason;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TabularReportResponse {
        private long totalCount;
        private long takenCount;
        private long snoozedCount;
        private long dismissedCount;
        private long postponedCount;
        private long othersCount;
        private List<TabularLogItem> rows;
    }
}
