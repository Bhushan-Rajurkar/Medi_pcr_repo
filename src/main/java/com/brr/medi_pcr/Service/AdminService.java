package com.brr.medi_pcr.Service;

import com.brr.medi_pcr.Dto.AdminDtos;
import com.brr.medi_pcr.Entity.*;
import com.brr.medi_pcr.Repository.*;
import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final FileRepository fileRepository;
    private final MedicineRepository medicineRepository;
    private final ReminderRepository reminderRepository;
    private final ProfileRepository profileRepository;
    private final Cloudinary cloudinary;
    private final PasswordEncoder passwordEncoder;

    // ==========================================
    // Admin Creation (System Administrator Only)
    // ==========================================
    @Transactional
    public AdminDtos.AdminUserSummaryResponse createAdmin(AdminDtos.CreateAdminRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("An account with email '" + email + "' already exists!");
        }

        User newAdmin = User.builder()
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_ADMIN)
                .enabled(true)
                .build();

        User saved = userRepository.save(newAdmin);
        log.info("New administrator account created: email='{}', name='{}'", saved.getEmail(), saved.getName());
        return mapToUserSummary(saved);
    }

    // ==========================================
    // User Traversal & Search
    // ==========================================
    @Transactional(readOnly = true)
    public Page<AdminDtos.AdminUserSummaryResponse> getAllUsers(
            String search,
            String roleStr,
            Boolean enabled,
            Pageable pageable) {

        Role role = null;
        if (roleStr != null && !roleStr.trim().isEmpty()) {
            role = Role.fromString(roleStr);
        }

        String searchKeyword = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        Page<User> usersPage = userRepository.searchUsers(searchKeyword, role, enabled, pageable);
        return usersPage.map(this::mapToUserSummary);
    }

    @Transactional(readOnly = true)
    public AdminDtos.AdminUserDetailResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        int prescriptionsCount = (int) prescriptionRepository.countByUserId(user.getId());
        int filesCount = (int) fileRepository.countByUserId(user.getId());
        int remindersCount = (int) reminderRepository.countByUserId(user.getId());

        AdminDtos.UserProfileDetail profileDetail = null;
        if (user.getProfile() != null) {
            ProfileEntity profile = user.getProfile();
            profileDetail = AdminDtos.UserProfileDetail.builder()
                    .profileId(profile.getId())
                    .phoneNumber(profile.getContactNumber())
                    .bloodGroup(profile.getBloodGroup())
                    .address(profile.getAddress())
                    .emergencyContactName(profile.getGuardianName())
                    .emergencyContactPhone(profile.getGuardianContact())
                    .allergies(profile.getAllergies() != null ? String.join(", ", profile.getAllergies()) : null)
                    .build();
        }

        return AdminDtos.AdminUserDetailResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .enabled(user.isEnabled())
                .profilePicture(user.getProfilePicture())
                .fcmToken(user.getFcmToken())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .prescriptionsCount(prescriptionsCount)
                .filesCount(filesCount)
                .remindersCount(remindersCount)
                .profile(profileDetail)
                .build();
    }

    // ==========================================
    // User Updates & Management
    // ==========================================
    @Transactional
    public AdminDtos.AdminUserSummaryResponse updateUser(Long userId, AdminDtos.AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new RuntimeException("Email already in use by another user: " + newEmail);
            }
            user.setEmail(newEmail);
        }

        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            user.setRole(Role.fromString(request.getRole()));
        }

        if (request.getEnabled() != null) {
            user.setEnabled(request.getEnabled());
        }

        User updated = userRepository.save(user);
        return mapToUserSummary(updated);
    }

    @Transactional
    public AdminDtos.AdminUserSummaryResponse updateUserRole(Long userId, String newRoleStr) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Role newRole = Role.fromString(newRoleStr);
        user.setRole(newRole);

        User updated = userRepository.save(user);
        log.info("Admin updated user {} role to {}", userId, newRole);
        return mapToUserSummary(updated);
    }

    @Transactional
    public AdminDtos.AdminUserSummaryResponse updateUserStatus(Long userId, boolean enabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        user.setEnabled(enabled);
        User updated = userRepository.save(user);
        log.info("Admin updated user {} enabled status to {}", userId, enabled);
        return mapToUserSummary(updated);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        userRepository.delete(user);
        log.info("Admin deleted user with id: {}", userId);
    }

    // ==========================================
    // System Statistics & Oversight
    // ==========================================
    @Transactional(readOnly = true)
    public AdminDtos.SystemStatsResponse getSystemStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByEnabled(true);
        long disabledUsers = userRepository.countByEnabled(false);
        long adminUsers = userRepository.countByRole(Role.ROLE_ADMIN);
        long regularUsers = userRepository.countByRole(Role.ROLE_USER);
        long totalPrescriptions = prescriptionRepository.count();
        long totalMedicines = medicineRepository.count();
        long totalFiles = fileRepository.count();
        long totalReminders = reminderRepository.count();

        return AdminDtos.SystemStatsResponse.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .disabledUsers(disabledUsers)
                .adminUsers(adminUsers)
                .regularUsers(regularUsers)
                .totalPrescriptions(totalPrescriptions)
                .totalMedicines(totalMedicines)
                .totalFiles(totalFiles)
                .totalReminders(totalReminders)
                .build();
    }

    // ==========================================
    // Global Prescription Management
    // ==========================================
    @Transactional(readOnly = true)
    public Page<AdminDtos.AdminPrescriptionSummaryResponse> getAllPrescriptions(Pageable pageable) {
        Page<PrescriptionData> prescriptions = prescriptionRepository.findAll(pageable);
        return prescriptions.map(p -> {
            User user = p.getUser();
            return AdminDtos.AdminPrescriptionSummaryResponse.builder()
                    .id(p.getId())
                    .userId(user != null ? user.getId() : null)
                    .userEmail(user != null ? user.getEmail() : null)
                    .userName(user != null ? user.getName() : null)
                    .doctorName(p.getDoctor() != null ? p.getDoctor().getDoctorNames() : null)
                    .hospitalName(p.getDoctor() != null ? p.getDoctor().getClinicName() : null)
                    .prescriptionDate(p.getPrescriptionDate())
                    .uploadDate(p.getUploadDate() != null ? p.getUploadDate().atStartOfDay() : null)
                    .medicinesCount(p.getMedicines() != null ? p.getMedicines().size() : 0)
                    .build();
        });
    }

    @Transactional
    public void deletePrescription(Long prescriptionId) {
        PrescriptionData prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new RuntimeException("Prescription not found with id: " + prescriptionId));
        prescriptionRepository.delete(prescription);
        log.info("Admin deleted prescription with id: {}", prescriptionId);
    }

    // ==========================================
    // Global Files Management
    // ==========================================
    @Transactional(readOnly = true)
    public Page<AdminDtos.AdminFileSummaryResponse> getAllFiles(Pageable pageable) {
        Page<FileEntity> files = fileRepository.findAll(pageable);
        return files.map(f -> {
            User user = f.getUser();
            return AdminDtos.AdminFileSummaryResponse.builder()
                    .id(f.getId())
                    .userId(user != null ? user.getId() : null)
                    .userEmail(user != null ? user.getEmail() : null)
                    .userName(user != null ? user.getName() : null)
                    .fileName(f.getFileName())
                    .originalFileName(f.getOriginalFileName())
                    .fileType(f.getFileType())
                    .fileSize(f.getSize())
                    .cloudinaryUrl(f.getCloudinaryUrl())
                    .createdAt(f.getUploadedAt())
                    .build();
        });
    }

    @Transactional
    public void deleteFile(Long fileId) {
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        if (file.getPublicId() != null) {
            try {
                cloudinary.uploader().destroy(file.getPublicId(), Map.of());
            } catch (Exception e) {
                log.warn("Failed to delete Cloudinary file for id {}: {}", fileId, e.getMessage());
            }
        }
        fileRepository.delete(file);
        log.info("Admin deleted file with id: {}", fileId);
    }

    // Helper mapper
    private AdminDtos.AdminUserSummaryResponse mapToUserSummary(User user) {
        int prescriptionsCount = (int) prescriptionRepository.countByUserId(user.getId());
        int filesCount = (int) fileRepository.countByUserId(user.getId());
        int remindersCount = (int) reminderRepository.countByUserId(user.getId());

        return AdminDtos.AdminUserSummaryResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .enabled(user.isEnabled())
                .profilePicture(user.getProfilePicture())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .prescriptionsCount(prescriptionsCount)
                .filesCount(filesCount)
                .remindersCount(remindersCount)
                .build();
    }
}
