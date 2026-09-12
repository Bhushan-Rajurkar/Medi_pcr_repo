package com.brr.medi_pcr.Dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ProfileDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileRequestDto {

        // Optional User Info updates
        private String name;
        private String profilePicture;

        // ==========================================
        // Mandatory Contact & Personal Info
        // ==========================================
        @NotBlank(message = "Contact number is mandatory")
        private String contactNumber;

        @NotBlank(message = "Address is mandatory")
        private String address;

        // ==========================================
        // Mandatory Guardian Details
        // ==========================================
        @NotBlank(message = "Guardian name is mandatory")
        private String guardianName;

        @NotBlank(message = "Guardian contact number is mandatory")
        private String guardianContact;

        @NotBlank(message = "Guardian address is mandatory")
        private String guardianAddress;

        // ==========================================
        // Mandatory Doctor Details
        // ==========================================
        @NotBlank(message = "Doctor name is mandatory")
        private String doctorName;

        @NotBlank(message = "Doctor contact number is mandatory")
        private String doctorContact;

        // ==========================================
        // Optional Health Details
        // ==========================================
        private String bloodPressure;
        private String heartRate;
        private Double weight;
        private Integer age;
        private Double height;
        private String bloodGroup;

        @Builder.Default
        private List<String> allergies = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileResponseDto {
        private Long id;
        private Long userId;

        // Default Account Details
        private String name;
        private String email;
        private String profilePicture;

        // Mandatory Contact Info
        private String contactNumber;
        private String address;

        // Mandatory Guardian Details
        private String guardianName;
        private String guardianContact;
        private String guardianAddress;

        // Mandatory Doctor Details
        private String doctorName;
        private String doctorContact;

        // Optional Health Details
        private String bloodPressure;
        private String heartRate;
        private Double weight;
        private Integer age;
        private Double height;
        private String bloodGroup;
        private List<String> allergies;

        // QR Code & Emergency Access
        private String qrCodeToken;
        private String qrCodeDataUrl;
        private String publicProfileUrl;
        private String emergencyViewUrl;

        @JsonProperty("isComplete")
        private boolean isComplete;

        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicEmergencyProfileDto {
        // Patient Basic Information
        private String name;
        private String email;
        private String profilePicture;
        private String contactNumber;
        private String address;

        // Emergency Contacts
        private String guardianName;
        private String guardianContact;
        private String guardianAddress;

        // Medical Contacts
        private String doctorName;
        private String doctorContact;

        // Vital Health Details
        private String bloodGroup;
        private List<String> allergies;
        private String bloodPressure;
        private String heartRate;
        private Double weight;
        private Integer age;
        private Double height;

        private LocalDateTime lastUpdated;
    }
}
