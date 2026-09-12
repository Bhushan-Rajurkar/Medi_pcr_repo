package com.brr.medi_pcr.Repository;


import com.brr.medi_pcr.Entity.FileEntity;
import com.brr.medi_pcr.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {


        List<FileEntity> findByUser(User user);

        Optional<FileEntity> findByIdAndUser(Long id, User user);


    List<FileEntity> findByFileNameContainingIgnoreCaseAndUser(
            String fileName,
            User user
    );

    long countByUser(User user);
    long countByUserId(Long userId);
}