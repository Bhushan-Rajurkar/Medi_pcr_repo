package com.brr.medi_pcr.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patient_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String age;
    private String gender;
    private String allergies;
    private String bp;
    private String heartRate;
    private String weight;

    private String fcmToken;
    @OneToOne
    @JoinColumn(name = "prescription_id")
    @JsonBackReference
    private PrescriptionData prescription;
}