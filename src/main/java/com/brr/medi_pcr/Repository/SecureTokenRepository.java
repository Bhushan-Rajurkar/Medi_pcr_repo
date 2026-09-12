package com.brr.medi_pcr.Repository;



import com.brr.medi_pcr.Entity.SecureToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SecureTokenRepository extends JpaRepository<SecureToken, Long> {
    Optional<SecureToken> findByToken(String token);
}