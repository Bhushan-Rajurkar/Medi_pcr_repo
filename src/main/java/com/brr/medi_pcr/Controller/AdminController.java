package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.AdminDtos;
import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // ==========================================
    // Admin Creation (System Administrator Only)
    // ==========================================
    @PostMapping("/create-admin")
    public ResponseEntity<ApiResponse<AdminDtos.AdminUserSummaryResponse>> createAdmin(
            @Valid @RequestBody AdminDtos.CreateAdminRequest request) {
        AdminDtos.AdminUserSummaryResponse created = adminService.createAdmin(request);
        return ResponseEntity.ok(ApiResponse.success("Administrator account created successfully", created));
    }

    // ==========================================
    // User Traversal & Search
    // ==========================================
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<AdminDtos.AdminUserSummaryResponse>>> getAllUsers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "enabled", required = false) Boolean enabled,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(value = "direction", defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<AdminDtos.AdminUserSummaryResponse> users = adminService.getAllUsers(search, role, enabled, pageable);
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<AdminDtos.AdminUserDetailResponse>> getUserById(@PathVariable Long id) {
        AdminDtos.AdminUserDetailResponse user = adminService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("User details retrieved successfully", user));
    }

    // ==========================================
    // User Management & Updates
    // ==========================================
    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<AdminDtos.AdminUserSummaryResponse>> updateUser(
            @PathVariable Long id,
            @RequestBody AdminDtos.AdminUpdateUserRequest request) {

        AdminDtos.AdminUserSummaryResponse updated = adminService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("User updated successfully", updated));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<AdminDtos.AdminUserSummaryResponse>> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody AdminDtos.ChangeRoleRequest request) {

        AdminDtos.AdminUserSummaryResponse updated = adminService.updateUserRole(id, request.getRole());
        return ResponseEntity.ok(ApiResponse.success("User role updated successfully", updated));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<AdminDtos.AdminUserSummaryResponse>> updateUserStatus(
            @PathVariable Long id,
            @RequestBody AdminDtos.ChangeStatusRequest request) {

        AdminDtos.AdminUserSummaryResponse updated = adminService.updateUserStatus(id, request.isEnabled());
        return ResponseEntity.ok(ApiResponse.success("User status updated successfully", updated));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully"));
    }

    // ==========================================
    // System Overview & Statistics
    // ==========================================
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminDtos.SystemStatsResponse>> getSystemStats() {
        AdminDtos.SystemStatsResponse stats = adminService.getSystemStats();
        return ResponseEntity.ok(ApiResponse.success("System statistics retrieved successfully", stats));
    }

    // ==========================================
    // Global Prescription Oversight
    // ==========================================
    @GetMapping("/prescriptions")
    public ResponseEntity<ApiResponse<Page<AdminDtos.AdminPrescriptionSummaryResponse>>> getAllPrescriptions(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "id") String sortBy,
            @RequestParam(value = "direction", defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<AdminDtos.AdminPrescriptionSummaryResponse> prescriptions = adminService.getAllPrescriptions(pageable);
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved successfully", prescriptions));
    }

    @DeleteMapping("/prescriptions/{id}")
    public ResponseEntity<ApiResponse<String>> deletePrescription(@PathVariable Long id) {
        adminService.deletePrescription(id);
        return ResponseEntity.ok(ApiResponse.success("Prescription deleted successfully"));
    }

    // ==========================================
    // Global Files Oversight
    // ==========================================
    @GetMapping("/files")
    public ResponseEntity<ApiResponse<Page<AdminDtos.AdminFileSummaryResponse>>> getAllFiles(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "id") String sortBy,
            @RequestParam(value = "direction", defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<AdminDtos.AdminFileSummaryResponse> files = adminService.getAllFiles(pageable);
        return ResponseEntity.ok(ApiResponse.success("Files retrieved successfully", files));
    }

    @DeleteMapping("/files/{id}")
    public ResponseEntity<ApiResponse<String>> deleteFile(@PathVariable Long id) {
        adminService.deleteFile(id);
        return ResponseEntity.ok(ApiResponse.success("File deleted successfully"));
    }
}
