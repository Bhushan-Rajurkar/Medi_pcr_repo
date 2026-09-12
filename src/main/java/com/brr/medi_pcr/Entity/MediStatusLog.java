package com.brr.medi_pcr.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "medi_status_logs", indexes = {
    @Index(name = "idx_user_status", columnList = "user_id, status"),
    @Index(name = "idx_log_date", columnList = "log_date"),
    @Index(name = "idx_medicine", columnList = "medicine_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediStatusLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Status: TAKEN, SNOOZED, DISMISSED, POSTPONED, OTHERS
    @Column(nullable = false)
    private String status;

    private String medicineName;
    private String slot; // MORNING, AFTERNOON, EVENING, NIGHT
    private LocalTime scheduledTime;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Column(name = "action_time", nullable = false)
    private LocalDateTime actionTime;

    @Column(length = 1000)
    private String reason;

    @Column(length = 1000)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.SET_NULL)
    @JsonIgnore
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reminder_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.SET_NULL)
    @JsonIgnore
    private Reminder reminder;
}
