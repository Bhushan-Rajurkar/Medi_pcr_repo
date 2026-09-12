package com.brr.medi_pcr.Repository;

import com.brr.medi_pcr.Entity.Role;
import com.brr.medi_pcr.Entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    long countByRole(Role role);

    long countByEnabled(boolean enabled);

    Page<User> findByRole(Role role, Pageable pageable);

    Page<User> findByEnabled(boolean enabled, Pageable pageable);

    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:enabled IS NULL OR u.enabled = :enabled)")
    Page<User> searchUsers(
            @Param("search") String search,
            @Param("role") Role role,
            @Param("enabled") Boolean enabled,
            Pageable pageable
    );
}