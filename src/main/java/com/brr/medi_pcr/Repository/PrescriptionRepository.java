package com.brr.medi_pcr.Repository;

import com.brr.medi_pcr.Entity.PrescriptionData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrescriptionRepository extends JpaRepository<PrescriptionData, Long> {
    List<PrescriptionData> findByUserId(Long userId);
    List<PrescriptionData> findByUserIdOrderByUploadDateDesc(Long userId);
    Optional<PrescriptionData> findByIdAndUserId(Long id, Long userId);
    Optional<PrescriptionData> findFirstByUserIdAndExternalPrescriptionId(Long userId, String externalPrescriptionId);
    long countByUserId(Long userId);
}