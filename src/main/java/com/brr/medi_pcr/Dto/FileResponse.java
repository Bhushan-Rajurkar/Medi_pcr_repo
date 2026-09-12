package com.brr.medi_pcr.Dto;

import lombok.*;

import java.time.LocalDateTime;
@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileResponse {

    private Long id;

    // User-defined file name
    private String fileName;

    // Actual uploaded file name
    private String originalFileName;

    private String fileType;

    private String resourceType;

    private String url;

    private String publicId;

    private Long size;

    private LocalDateTime uploadedAt;
}