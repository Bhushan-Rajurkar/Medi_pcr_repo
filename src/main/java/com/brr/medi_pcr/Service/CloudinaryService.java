package com.brr.medi_pcr.Service;


import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    // ==========================
    // Upload File
    // ==========================
    public Map<String, Object> uploadFile(MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is empty.");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase().trim() : "";
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        String folder;
        String resourceType;

        if (contentType.startsWith("image/") || originalFilename.matches(".*\\.(jpg|jpeg|png|webp|gif|bmp|tiff|heic|svg)$")) {
            folder = "mediscan-ai/images";
            resourceType = "image";
        } else {
            folder = "mediscan-ai/reports";
            resourceType = "auto";
        }

        return cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", folder,
                        "resource_type", resourceType,
                        "access_mode", "public",
                        "type", "upload",
                        "use_filename", true,
                        "unique_filename", true,
                        "overwrite", false
                )
        );
    }

    // ==========================
    // Delete File
    // ==========================
    public Map<String, Object> deleteFile(String publicId, String resourceType) throws IOException {

        Map<String, Object> result = cloudinary.uploader().destroy(
                publicId,
                ObjectUtils.asMap(
                        "resource_type", resourceType,
                        "invalidate", true
                )
        );

        System.out.println("Cloudinary Delete Response : " + result);

        return result;
    }


}