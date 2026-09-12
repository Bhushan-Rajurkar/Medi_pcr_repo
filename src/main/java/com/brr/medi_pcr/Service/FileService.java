
package com.brr.medi_pcr.Service;


import com.brr.medi_pcr.Dto.FileResponse;
import com.brr.medi_pcr.Entity.FileEntity;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.FileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileRepository fileRepository;
    private final AuthService userService;
    private final CloudinaryService cloudinaryService;

    private static final java.util.Set<String> ALLOWED_EXTENSIONS = java.util.Set.of(
            "pdf", "jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "heic", "svg", "doc", "docx"
    );

    // ==========================
    // Upload File
    // ==========================
    public FileResponse uploadFile(MultipartFile file, String fileName) throws Exception {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Please select a file.");
        }

        String targetFileName = (fileName != null && !fileName.trim().isEmpty())
                ? fileName.trim()
                : (file.getOriginalFilename() != null ? file.getOriginalFilename() : "document");

        if (!isAllowedFileType(file)) {
            throw new RuntimeException("Only PDF, JPG, JPEG, PNG, WEBP, and document files are allowed.");
        }

        User currentUser = userService.getCurrentProfile();

        Map<?, ?> uploadResult = cloudinaryService.uploadFile(file);

        FileEntity entity = new FileEntity();

        // User-defined name or original filename
        entity.setFileName(targetFileName);

        // Original uploaded filename
        entity.setOriginalFileName(file.getOriginalFilename());

        entity.setFileType(file.getContentType());
        entity.setCloudinaryUrl(uploadResult.get("secure_url").toString());
        entity.setResourceType(uploadResult.get("resource_type").toString());
        entity.setPublicId(uploadResult.get("public_id").toString());
        entity.setSize(file.getSize());
        entity.setUploadedAt(LocalDateTime.now());
        entity.setUser(currentUser);

        FileEntity savedFile = fileRepository.save(entity);

        return convert(savedFile);
    }


    // ==========================
    // List Logged-in User Files
    // ==========================
    public List<FileResponse> getMyFiles() {

       User currentUser = userService.getCurrentProfile();

        return fileRepository.findByUser(currentUser)
                .stream()
                .map(this::convert)
                .collect(Collectors.toList());
    }


    public List<FileResponse> searchFiles(String keyword) {

        User currentUser = userService.getCurrentProfile();

        List<FileEntity> files = fileRepository
                .findByFileNameContainingIgnoreCaseAndUser(
                        keyword,
                        currentUser
                );

        return files.stream()
                .map(this::convert)
                .collect(Collectors.toList());
    }

    // ==========================
    // Get File By Id
    // ==========================
    public FileResponse getFile(Long id) {

        User currentUser = userService.getCurrentProfile();

        FileEntity file = fileRepository
                .findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new RuntimeException("File not found."));

        return convert(file);
    }

    // ==========================
    // Delete File
    // ==========================
    public String deleteFile(Long id) throws Exception {

       User currentUser = userService.getCurrentProfile();

        FileEntity file = fileRepository
                .findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new RuntimeException("File not found."));

        System.out.println("Deleting File ID: " + file.getId());
        System.out.println("Public ID: " + file.getPublicId());
        System.out.println("Resource Type: " + file.getResourceType());

        cloudinaryService.deleteFile(
                file.getPublicId(),
                file.getResourceType()
        );

        fileRepository.delete(file);

        return "File deleted successfully.";
    }

    // ==========================
    // Download File
    // ==========================
    public FileEntity downloadFile(Long id) {

       User currentUser = userService.getCurrentProfile();

        return fileRepository
                .findByIdAndUser(id, currentUser)
                .orElseThrow(() ->
                        new RuntimeException("File not found."));
    }

    // ==========================
    // Entity -> DTO
    // ==========================
    private FileResponse convert(FileEntity file) {

        return FileResponse.builder()
                .id(file.getId())
                .fileName(file.getFileName())
                .originalFileName(file.getOriginalFileName())
                .fileType(file.getFileType())
                .resourceType(file.getResourceType())
                .publicId(file.getPublicId())
                .url(file.getCloudinaryUrl())
                .size(file.getSize())
                .uploadedAt(file.getUploadedAt())
                .build();
    }

    private boolean isAllowedFileType(MultipartFile file) {
        if (file == null || file.isEmpty()) return false;

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase().trim() : "";
        if (contentType.startsWith("image/") || contentType.contains("pdf") || contentType.contains("document") || contentType.contains("msword")) {
            return true;
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
            return ALLOWED_EXTENSIONS.contains(ext);
        }

        return false;
    }
}