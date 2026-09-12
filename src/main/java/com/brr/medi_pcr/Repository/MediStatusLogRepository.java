package com.brr.medi_pcr.Repository;

import com.brr.medi_pcr.Entity.MediStatusLog;
import com.brr.medi_pcr.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MediStatusLogRepository extends JpaRepository<MediStatusLog, Long> {

    List<MediStatusLog> findByUserOrderByActionTimeDesc(User user);

    java.util.Optional<MediStatusLog> findTopByMedicineOrderByActionTimeDesc(com.brr.medi_pcr.Entity.Medicine medicine);

    List<MediStatusLog> findByUserAndLogDateBetweenOrderByActionTimeDesc(User user, LocalDate start, LocalDate end);

    long countByUserAndStatus(User user, String status);

    long countByUserAndStatusAndLogDateBetween(User user, String status, LocalDate start, LocalDate end);

    long countByUserAndLogDateBetween(User user, LocalDate start, LocalDate end);

    @Query("SELECT l.logDate, l.status, COUNT(l) FROM MediStatusLog l " +
           "WHERE l.user = :user AND l.logDate BETWEEN :start AND :end " +
           "GROUP BY l.logDate, l.status ORDER BY l.logDate ASC")
    List<Object[]> findDailyAggregations(
            @Param("user") User user,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM MediStatusLog l WHERE l.medicine.id IN :medicineIds")
    void deleteByMedicineIds(@Param("medicineIds") List<Long> medicineIds);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM MediStatusLog l WHERE l.medicine = :medicine")
    void deleteByMedicine(@Param("medicine") com.brr.medi_pcr.Entity.Medicine medicine);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE MediStatusLog l SET l.medicine = null, l.reminder = null WHERE l.medicine = :medicine")
    void disassociateMedicine(@Param("medicine") com.brr.medi_pcr.Entity.Medicine medicine);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE MediStatusLog l SET l.medicine = null, l.reminder = null WHERE l.medicine.id IN :medicineIds")
    void disassociateMedicines(@Param("medicineIds") List<Long> medicineIds);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE MediStatusLog l SET l.reminder = null WHERE l.reminder.id IN :reminderIds")
    void disassociateReminders(@Param("reminderIds") List<Long> reminderIds);
}
