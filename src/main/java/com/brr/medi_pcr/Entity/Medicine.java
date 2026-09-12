package com.brr.medi_pcr.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "medicines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@lombok.ToString(exclude = {"reminders", "prescription"})
public class Medicine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String medicineName;
    private String status;
    private String mediStatus;
    private String frequency;

    private boolean morning;
    private LocalTime morningTime;
    @Builder.Default
    private String morningStatus = "PENDING";

    private boolean afternoon;
    private LocalTime afternoonTime;
    @Builder.Default
    private String afternoonStatus = "PENDING";

    private boolean evening;
    private LocalTime eveningTime;
    @Builder.Default
    private String eveningStatus = "PENDING";

    private boolean night;
    private LocalTime nightTime;
    @Builder.Default
    private String nightStatus = "PENDING";

    private String foodInstruction; // e.g., "BEFORE_FOOD", "AFTER_FOOD"
    private Integer totalQuantity;
    private LocalDate startDate;
    private LocalDate endDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id")
    @JsonBackReference
    private PrescriptionData prescription;

    @OneToMany(mappedBy = "medicine", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<Reminder> reminders = new ArrayList<>();
}