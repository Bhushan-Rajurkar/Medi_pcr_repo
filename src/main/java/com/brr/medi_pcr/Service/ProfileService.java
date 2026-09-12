package com.brr.medi_pcr.Service;

import com.brr.medi_pcr.Dto.ProfileDtos;
import com.brr.medi_pcr.Entity.ProfileEntity;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.ProfileRepository;
import com.brr.medi_pcr.Repository.UserRepository;
import com.brr.medi_pcr.Util.QrCodeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final QrCodeUtil qrCodeUtil;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${server.servlet.context-path:/api/v1.1}")
    private String contextPath;

    /**
     * Build the full emergency view URL for scanning.
     */
    public String buildEmergencyViewUrl(String qrCodeToken) {
        String normalizedContext = contextPath.endsWith("/")
                ? contextPath.substring(0, contextPath.length() - 1)
                : contextPath;
        return baseUrl + normalizedContext + "/profile/emergency/" + qrCodeToken + "/view";
    }

    /**
     * Build the public API URL.
     */
    public String buildPublicProfileApiUrl(String qrCodeToken) {
        String normalizedContext = contextPath.endsWith("/")
                ? contextPath.substring(0, contextPath.length() - 1)
                : contextPath;
        return baseUrl + normalizedContext + "/profile/public/" + qrCodeToken;
    }

    /**
     * Retrieve current user's profile or an initialized template if not yet created.
     */
    @Transactional(readOnly = true)
    public ProfileDtos.ProfileResponseDto getProfileByUserEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return profileRepository.findByUser(user)
                .map(this::mapToResponseDto)
                .orElseGet(() -> {
                    // Profile not yet completed, return user default info
                    return ProfileDtos.ProfileResponseDto.builder()
                            .userId(user.getId())
                            .name(user.getName())
                            .email(user.getEmail())
                            .profilePicture(user.getProfilePicture())
                            .isComplete(false)
                            .allergies(new ArrayList<>())
                            .build();
                });
    }

    /**
     * Create or update profile with mandatory & health details.
     * Generates or refreshes the unique QR code.
     */
    @Transactional
    public ProfileDtos.ProfileResponseDto saveOrUpdateProfile(String email, ProfileDtos.ProfileRequestDto request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Optional update of user account name/picture
        boolean userModified = false;
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
            userModified = true;
        }
        if (request.getProfilePicture() != null && !request.getProfilePicture().trim().isEmpty()) {
            user.setProfilePicture(request.getProfilePicture().trim());
            userModified = true;
        }
        if (userModified) {
            userRepository.save(user);
        }

        ProfileEntity profile = profileRepository.findByUser(user)
                .orElseGet(() -> {
                    String token = "med_" + UUID.randomUUID().toString().replace("-", "");
                    return ProfileEntity.builder()
                            .user(user)
                            .qrCodeToken(token)
                            .build();
                });

        if (profile.getQrCodeToken() == null || profile.getQrCodeToken().trim().isEmpty()) {
            profile.setQrCodeToken("med_" + UUID.randomUUID().toString().replace("-", ""));
        }

        // Set Mandatory Personal & Contact
        profile.setContactNumber(request.getContactNumber().trim());
        profile.setAddress(request.getAddress().trim());

        // Set Mandatory Guardian Details
        profile.setGuardianName(request.getGuardianName().trim());
        profile.setGuardianContact(request.getGuardianContact().trim());
        profile.setGuardianAddress(request.getGuardianAddress().trim());

        // Set Mandatory Doctor Details
        profile.setDoctorName(request.getDoctorName().trim());
        profile.setDoctorContact(request.getDoctorContact().trim());

        // Set Optional Health Details
        profile.setBloodPressure(request.getBloodPressure() != null ? request.getBloodPressure().trim() : null);
        profile.setHeartRate(request.getHeartRate() != null ? request.getHeartRate().trim() : null);
        profile.setWeight(request.getWeight());
        profile.setAge(request.getAge());
        profile.setHeight(request.getHeight());
        profile.setBloodGroup(request.getBloodGroup() != null ? request.getBloodGroup().trim() : null);

        if (request.getAllergies() != null) {
            profile.setAllergies(new ArrayList<>(request.getAllergies()));
        }

        // Generate QR code encoding the public emergency view link
        String emergencyLink = buildEmergencyViewUrl(profile.getQrCodeToken());
        String qrDataUrl = qrCodeUtil.generateQrCodeBase64(emergencyLink);
        profile.setQrCodeDataUrl(qrDataUrl);
        profile.setComplete(true);

        ProfileEntity saved = profileRepository.save(profile);
        log.info("Emergency profile and unique QR code successfully generated for user: {}", email);

        return mapToResponseDto(saved);
    }

    /**
     * Regenerates the unique QR token and QR code image for security or update.
     */
    @Transactional
    public ProfileDtos.ProfileResponseDto regenerateQrCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        ProfileEntity profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Profile does not exist. Please complete your profile first."));

        String newToken = "med_" + UUID.randomUUID().toString().replace("-", "");
        profile.setQrCodeToken(newToken);

        String emergencyLink = buildEmergencyViewUrl(newToken);
        profile.setQrCodeDataUrl(qrCodeUtil.generateQrCodeBase64(emergencyLink));

        ProfileEntity saved = profileRepository.save(profile);
        return mapToResponseDto(saved);
    }

    /**
     * Publicly accessible method to get emergency details by scanning the QR code token.
     */
    @Transactional(readOnly = true)
    public ProfileDtos.PublicEmergencyProfileDto getPublicEmergencyProfile(String qrCodeToken) {
        ProfileEntity profile = profileRepository.findByQrCodeToken(qrCodeToken)
                .orElseThrow(() -> new RuntimeException("Emergency profile not found or QR code expired."));

        User user = profile.getUser();

        return ProfileDtos.PublicEmergencyProfileDto.builder()
                .name(user != null ? user.getName() : "Unknown Patient")
                .email(user != null ? user.getEmail() : null)
                .profilePicture(user != null ? user.getProfilePicture() : null)
                .contactNumber(profile.getContactNumber())
                .address(profile.getAddress())
                .guardianName(profile.getGuardianName())
                .guardianContact(profile.getGuardianContact())
                .guardianAddress(profile.getGuardianAddress())
                .doctorName(profile.getDoctorName())
                .doctorContact(profile.getDoctorContact())
                .bloodGroup(profile.getBloodGroup())
                .allergies(profile.getAllergies() != null ? new ArrayList<>(profile.getAllergies()) : new ArrayList<>())
                .bloodPressure(profile.getBloodPressure())
                .heartRate(profile.getHeartRate())
                .weight(profile.getWeight())
                .age(profile.getAge())
                .height(profile.getHeight())
                .lastUpdated(profile.getUpdatedAt() != null ? profile.getUpdatedAt() : profile.getCreatedAt())
                .build();
    }

    /**
     * Directly generate or retrieve QR code PNG byte stream for raw download or image display.
     */
    @Transactional(readOnly = true)
    public byte[] getQrCodeImageBytes(String qrCodeToken) {
        ProfileEntity profile = profileRepository.findByQrCodeToken(qrCodeToken)
                .orElseThrow(() -> new RuntimeException("Emergency profile not found."));

        String emergencyLink = buildEmergencyViewUrl(profile.getQrCodeToken());
        return qrCodeUtil.generateQrCodeBytes(emergencyLink);
    }

    private ProfileDtos.ProfileResponseDto mapToResponseDto(ProfileEntity profile) {
        User user = profile.getUser();
        String token = profile.getQrCodeToken();

        return ProfileDtos.ProfileResponseDto.builder()
                .id(profile.getId())
                .userId(user != null ? user.getId() : null)
                .name(user != null ? user.getName() : null)
                .email(user != null ? user.getEmail() : null)
                .profilePicture(user != null ? user.getProfilePicture() : null)
                .contactNumber(profile.getContactNumber())
                .address(profile.getAddress())
                .guardianName(profile.getGuardianName())
                .guardianContact(profile.getGuardianContact())
                .guardianAddress(profile.getGuardianAddress())
                .doctorName(profile.getDoctorName())
                .doctorContact(profile.getDoctorContact())
                .bloodPressure(profile.getBloodPressure())
                .heartRate(profile.getHeartRate())
                .weight(profile.getWeight())
                .age(profile.getAge())
                .height(profile.getHeight())
                .bloodGroup(profile.getBloodGroup())
                .allergies(profile.getAllergies() != null ? new ArrayList<>(profile.getAllergies()) : new ArrayList<>())
                .qrCodeToken(token)
                .qrCodeDataUrl(profile.getQrCodeDataUrl())
                .publicProfileUrl(token != null ? buildPublicProfileApiUrl(token) : null)
                .emergencyViewUrl(token != null ? buildEmergencyViewUrl(token) : null)
                .isComplete(profile.isComplete())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
