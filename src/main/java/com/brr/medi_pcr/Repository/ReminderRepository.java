package com.brr.medi_pcr.Repository;


import com.brr.medi_pcr.Entity.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
//    @Query("SELECT r FROM Reminder r " +
//           "JOIN FETCH r.medicine m " +
//           "JOIN FETCH m.prescription p " +
//           "JOIN FETCH p.user u " +
//           "WHERE m.status = 'ACTIVE' " +
//           "AND m.endDate >= :today " +
//           "AND m.startDate <= :today " +
//           "AND r.reminderTime = :currentTime " +
//           "AND u.fcmToken IS NOT NULL")
// List<Reminder> findDueReminders(@Param("today") LocalDate today, @Param("currentTime") LocalTime currentTime);

    @Query("SELECT r FROM Reminder r " +
            "JOIN FETCH r.medicine m " +
            "JOIN FETCH m.prescription p " +
            "JOIN FETCH p.user u " +
            "WHERE m.status = 'ACTIVE' " +               // <--- Rule 1: Must be ACTIVE
            "AND m.endDate >= :today " +                 // <--- Rule 2: End date not passed
            "AND m.startDate <= :today " +               // <--- Rule 3: Start date has begun
            "AND r.reminderTime = :currentTime " +
            "AND u.fcmToken IS NOT NULL")
    List<Reminder> findDueReminders(
            @Param("today") LocalDate today,
            @Param("currentTime") LocalTime currentTime
    );

    @Query("SELECT COUNT(r) FROM Reminder r WHERE r.medicine.prescription.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);
}