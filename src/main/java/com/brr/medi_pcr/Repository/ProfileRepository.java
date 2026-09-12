package com.brr.medi_pcr.Repository;

import com.brr.medi_pcr.Entity.ProfileEntity;
import com.brr.medi_pcr.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProfileRepository extends JpaRepository<ProfileEntity, Long> {

    Optional<ProfileEntity> findByUser(User user);

    Optional<ProfileEntity> findByUser_Email(String email);

    Optional<ProfileEntity> findByQrCodeToken(String qrCodeToken);

    boolean existsByQrCodeToken(String qrCodeToken);
}
