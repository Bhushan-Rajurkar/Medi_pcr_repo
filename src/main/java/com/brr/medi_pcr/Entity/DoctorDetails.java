package com.brr.medi_pcr.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "doctor_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String clinicName;
    private String doctorNames; // Comma-separated or JSON string
    private String address;
    private String contactNumber;

    @OneToOne
    @JoinColumn(name = "prescription_id")
    @JsonBackReference
    private PrescriptionData prescription;
}