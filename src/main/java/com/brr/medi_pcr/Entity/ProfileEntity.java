package com.brr.medi_pcr.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    @JsonIgnore
    private User user;

    // ==========================================
    // Mandatory Contact & Personal Details
    // ==========================================
    @Column(nullable = false)
    private String contactNumber;

    @Column(nullable = false, length = 500)
    private String address;

    // ==========================================
    // Mandatory Guardian Details
    // ==========================================
    @Column(nullable = false)
    private String guardianName;

    @Column(nullable = false)
    private String guardianContact;

    @Column(nullable = false, length = 500)
    private String guardianAddress;

    // ==========================================
    // Mandatory Doctor Details
    // ==========================================
    @Column(nullable = false)
    private String doctorName;

    @Column(nullable = false)
    private String doctorContact;

    // ==========================================
    // Optional Health Details
    // ==========================================
    @Column(nullable = true)
    private String bloodPressure;

    @Column(nullable = true)
    private String heartRate;

    @Column(nullable = true)
    private Double weight;

    @Column(nullable = true)
    private Integer age;

    @Column(nullable = true)
    private Double height;

    @Column(nullable = true)
    private String bloodGroup;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "profile_allergies", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "allergy")
    @Builder.Default
    private List<String> allergies = new ArrayList<>();

    // ==========================================
    // QR Code & Status
    // ==========================================
    @Column(unique = true, nullable = false)
    private String qrCodeToken;

    @Column(name = "qr_code_data_url", columnDefinition = "TEXT")
    private String qrCodeDataUrl;

    @Builder.Default
    @Column(nullable = false)
    private boolean isComplete = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
