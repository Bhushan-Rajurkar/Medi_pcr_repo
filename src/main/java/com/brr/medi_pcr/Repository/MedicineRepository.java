package com.brr.medi_pcr.Repository;

import com.brr.medi_pcr.Entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    // Fetch all medicines by status
    List<Medicine> findByStatus(String status);

    // Fetch medicines belonging to a specific prescription
    List<Medicine> findByPrescriptionId(Long prescriptionId);

    // Fetch medicines belonging to a specific user
    List<Medicine> findByPrescriptionUserId(Long userId);

    // Fetch medicines for user by status
    List<Medicine> findByPrescriptionUserIdAndStatusIgnoreCase(Long userId, String status);

    // Find a single medicine by id belonging to user
    Optional<Medicine> findByIdAndPrescriptionUserId(Long id, Long userId);
}