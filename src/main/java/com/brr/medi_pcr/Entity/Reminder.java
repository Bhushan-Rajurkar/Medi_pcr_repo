package com.brr.medi_pcr.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Entity
@Table(name = "reminders", indexes = {
    @Index(name = "idx_reminder_time", columnList = "reminderTime")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@lombok.ToString(exclude = "medicine")
public class Reminder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String slot;
    private LocalTime reminderTime;
    private LocalTime originalTime;

    @Builder.Default
    private int snoozeCount = 0;

    private java.time.LocalDate lastPostponedDate;

    private java.time.LocalDate lastActionDate;

    @Builder.Default
    private String mediStatus = "PENDING";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id")
    @JsonBackReference
    private Medicine medicine;
}