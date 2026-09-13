package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Dto.FileResponse;
import com.brr.medi_pcr.Entity.FileEntity;
import com.brr.medi_pcr.Service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileController {

    private final FileService fileService;

    // ==========================
    // Upload File
    // ==========================
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileResponse>> uploadFile(
            @RequestParam(value = "file", required = false) MultipartFile fileParam,
            @RequestPart(value = "file", required = false) MultipartFile filePart,
            @RequestParam(value = "fileName", required = false) String fileName,
            @RequestParam(value = "name", required = false) String name) throws Exception {

        MultipartFile file = fileParam != null ? fileParam : filePart;
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Please select a valid file to upload."));
        }

        String chosenName = (fileName != null && !fileName.trim().isEmpty()) ? fileName.trim() : name;
        FileResponse response = fileService.uploadFile(file, chosenName);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("File uploaded successfully", response));
    }

    // ==========================
    // List Logged-in User Files
    // ==========================
    @GetMapping
    public ResponseEntity<ApiResponse<List<FileResponse>>> getMyFiles() {
        List<FileResponse> files = fileService.getMyFiles();
        return ResponseEntity.ok(ApiResponse.success("Files retrieved successfully", files));
    }

    // ==========================
    // Get Single File Info
    // ==========================
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FileResponse>> getFile(@PathVariable Long id) {
        FileResponse file = fileService.getFile(id);
        return ResponseEntity.ok(ApiResponse.success("File retrieved successfully", file));
    }

    // ==========================
    // Search Files
    // ==========================
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<FileResponse>>> searchFiles(@RequestParam("keyword") String keyword) {
        List<FileResponse> files = fileService.searchFiles(keyword);
        return ResponseEntity.ok(ApiResponse.success("Files matching keyword retrieved", files));
    }

    // ==========================
    // Delete File
    // ==========================
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteFile(@PathVariable Long id) throws Exception {
        String result = fileService.deleteFile(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();

    }

    // ==========================
    // Download File
    // ==========================
    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        try {
            FileEntity file = fileService.downloadFile(id);
            Resource resource = new UrlResource(file.getCloudinaryUrl());

            String filename = file.getFileName();
            if (filename == null || filename.isBlank()) {
                filename = file.getOriginalFileName();
            }

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
