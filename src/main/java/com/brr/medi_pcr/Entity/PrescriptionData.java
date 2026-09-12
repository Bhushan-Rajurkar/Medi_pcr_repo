package com.brr.medi_pcr.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String externalPrescriptionId;
    private LocalDate uploadDate;
    private LocalDate prescriptionDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @OneToOne(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    private DoctorDetails doctor;

    @OneToOne(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    private PatientDetails patient;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Medicine> medicines = new ArrayList<>();
}