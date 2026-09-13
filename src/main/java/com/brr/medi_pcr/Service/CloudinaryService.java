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

        if (contentType.startsWith("image/") || contentType.equals("application/pdf") || originalFilename.matches(".*\\.(jpg|jpeg|png|webp|gif|bmp|tiff|heic|svg|pdf)$")) {
            folder = "mediscan-ai/images";
            resourceType = "image";
        } else {
            folder = "mediscan-ai/reports";
            resourceType = "raw";
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
    // Generate Signed URL (Prevents 401 Unauthorized errors on Cloudinary)
    // ==========================
    public String generateSignedUrl(String publicId, String resourceType) {
        return generateSignedUrl(publicId, resourceType, null);
    }

    public String generateSignedUrl(String publicId, String resourceType, String originalFilename) {
        try {
            if (publicId == null || publicId.isBlank()) return null;

            String resType = (resourceType != null && !resourceType.isBlank()) ? resourceType : "image";
            var urlBuilder = cloudinary.url()
                    .resourceType(resType)
                    .type("upload")
                    .signed(true)
                    .secure(true);

            // Extract extension if present
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase().trim();
            } else if (publicId.contains(".")) {
                ext = publicId.substring(publicId.lastIndexOf(".") + 1).toLowerCase().trim();
            }

            // For image resourceType (including PDF treated as image), specify format if not already in publicId
            if ("image".equalsIgnoreCase(resType) && !ext.isEmpty() && !publicId.toLowerCase().endsWith("." + ext)) {
                urlBuilder.format(ext);
            }

            return urlBuilder.generate(publicId);
        } catch (Exception e) {
            return null;
        }
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