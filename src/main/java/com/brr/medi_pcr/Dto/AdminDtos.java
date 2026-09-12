package com.brr.medi_pcr.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class AdminDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateAdminRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminUserSummaryResponse {
        private Long id;
        private String name;
        private String email;
        private String role;
        private boolean enabled;
        private String profilePicture;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private int prescriptionsCount;
        private int filesCount;
        private int remindersCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminUserDetailResponse {
        private Long id;
        private String name;
        private String email;
        private String role;
        private boolean enabled;
        private String profilePicture;
        private String fcmToken;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private int prescriptionsCount;
        private int filesCount;
        private int remindersCount;
        // User profile info if exists
        private UserProfileDetail profile;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserProfileDetail {
        private Long profileId;
        private String phoneNumber;
        private String bloodGroup;
        private String gender;
        private LocalDate dateOfBirth;
        private String emergencyContactName;
        private String emergencyContactPhone;
        private String address;
        private String allergies;
        private String chronicConditions;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminUpdateUserRequest {
        private String name;
        private String email;
        private String role;
        private Boolean enabled;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChangeRoleRequest {
        @NotBlank(message = "Role is required (ROLE_ADMIN or ROLE_USER)")
        private String role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChangeStatusRequest {
        private boolean enabled;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SystemStatsResponse {
        private long totalUsers;
        private long activeUsers;
        private long disabledUsers;
        private long adminUsers;
        private long regularUsers;
        private long totalPrescriptions;
        private long totalMedicines;
        private long totalFiles;
        private long totalReminders;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminPrescriptionSummaryResponse {
        private Long id;
        private Long userId;
        private String userEmail;
        private String userName;
        private String doctorName;
        private String hospitalName;
        private LocalDate prescriptionDate;
        private LocalDateTime uploadDate;
        private int medicinesCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminFileSummaryResponse {
        private Long id;
        private Long userId;
        private String userEmail;
        private String userName;
        private String fileName;
        private String originalFileName;
        private String fileType;
        private Long fileSize;
        private String cloudinaryUrl;
        private LocalDateTime createdAt;
    }
}
