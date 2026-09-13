package com.brr.medi_pcr.Entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor

@Entity
@Table(name = "files")
public class FileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName;          // User-defined name

    @Column(nullable = false)
    private String originalFileName;  // Actual uploaded filename

    @Column(nullable = false)
    private String resourceType;

    @Column(nullable = false)
    private String fileType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String cloudinaryUrl;

    @Column(nullable = false)
    private String publicId;

    private Long size;

    private LocalDateTime uploadedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

}