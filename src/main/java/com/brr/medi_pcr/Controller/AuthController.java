package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Dto.AuthDtos;
import com.brr.medi_pcr.Service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    // ==========================================
    // Registration
    // ==========================================
    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<String>> registerJson(
            @Valid @RequestBody AuthDtos.RegisterRequest request) {
        authService.register(request, null);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse
                        .success("Registration successful. Please check your email to activate your account."));
    }

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> registerMultipart(
            @RequestPart(value = "userData", required = false) AuthDtos.RegisterRequest userData,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "password", required = false) String password,
            @RequestPart(value = "profilePicture", required = false) MultipartFile profilePicturePart,
            @RequestParam(value = "profilePicture", required = false) MultipartFile profilePictureParam) {

        MultipartFile profilePicture = profilePicturePart != null ? profilePicturePart : profilePictureParam;

        AuthDtos.RegisterRequest request;
        if (userData != null) {
            request = userData;
        } else {
            request = AuthDtos.RegisterRequest.builder()
                    .name(name)
                    .email(email)
                    .password(password)
                    .build();
        }

        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Name is required"));
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is required"));
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password must be at least 6 characters"));
        }

        authService.register(request, profilePicture);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse
                        .success("Registration successful. Please check your email to activate your account."));
    }

    @PostMapping(value = "/register/multipart", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> registerMultipartAlias(
            @RequestPart(value = "userData", required = false) AuthDtos.RegisterRequest userData,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "password", required = false) String password,
            @RequestPart(value = "profilePicture", required = false) MultipartFile profilePicturePart,
            @RequestParam(value = "profilePicture", required = false) MultipartFile profilePictureParam) {
        return registerMultipart(userData, name, email, password, profilePicturePart, profilePictureParam);
    }

    // ==========================================
    // Account Verification
    // ==========================================
    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<String>> verifyAccount(@RequestParam("token") String token) {
        authService.verifyAccount(token);
        return ResponseEntity.ok(ApiResponse.success("Account activated successfully! You can now log in."));
    }

    @GetMapping("/activate")
    public ResponseEntity<ApiResponse<String>> activateAccount(@RequestParam("token") String token) {
        authService.verifyAccount(token);
        return ResponseEntity.ok(ApiResponse.success("Account activated successfully! You can now log in."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<String>> resendVerification(
            @Valid @RequestBody AuthDtos.ResendVerificationRequest request) {
        authService.resendVerificationEmail(request.getEmail());
        return ResponseEntity
                .ok(ApiResponse.success("Verification email resent successfully. Please check your inbox."));
    }

    // ==========================================
    // Login
    // ==========================================
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> login(
            @Valid @RequestBody AuthDtos.LoginRequest request) {
        AuthDtos.AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    // ==========================================
    // Forgot Password & Reset Password
    // ==========================================
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @RequestBody(required = false) AuthDtos.ForgotPasswordRequest request,
            @RequestParam(value = "email", required = false) String emailParam) {

        String email = null;
        if (request != null && request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            email = request.getEmail();
        } else if (emailParam != null && !emailParam.trim().isEmpty()) {
            email = emailParam;
        }

        if (email == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email is required for password reset."));
        }

        authService.triggerForgotPassword(email);
        return ResponseEntity.ok(ApiResponse.success("Password reset link sent to your email."));
    }

    @GetMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> validateResetToken(@RequestParam("token") String token) {
        boolean isValid = authService.validateResetToken(token);
        if (isValid) {
            return ResponseEntity.ok(ApiResponse.success("Reset token is valid."));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Reset token is invalid or has expired."));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestBody AuthDtos.ResetPasswordRequest request) {

        String token = (request.getToken() != null && !request.getToken().trim().isEmpty())
                ? request.getToken()
                : tokenParam;

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Reset token is required."));
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password must be at least 6 characters."));
        }

        authService.completePasswordReset(token, request.getNewPassword());
        return ResponseEntity
                .ok(ApiResponse.success("Password reset successfully. You can now login with your new password."));
    }

    // ==========================================
    // Profile & Account Management
    // ==========================================
    @GetMapping({ "/me", "/profile" })
    public ResponseEntity<ApiResponse<AuthDtos.UserProfileResponse>> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        AuthDtos.UserProfileResponse profile = authService.getUserProfile(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    @PutMapping(value = "/profile", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<AuthDtos.UserProfileResponse>> updateProfileJson(
            Authentication authentication,
            @RequestBody AuthDtos.UpdateProfileRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        AuthDtos.UserProfileResponse profile = authService.updateProfile(
                authentication.getName(),
                request != null ? request.getName() : null,
                null);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", profile));
    }

    @PutMapping(value = "/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AuthDtos.UserProfileResponse>> updateProfileMultipart(
            Authentication authentication,
            @RequestParam(value = "name", required = false) String name,
            @RequestPart(value = "profilePicture", required = false) MultipartFile profilePicturePart,
            @RequestParam(value = "profilePicture", required = false) MultipartFile profilePictureParam) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        MultipartFile profilePicture = profilePicturePart != null ? profilePicturePart : profilePictureParam;
        AuthDtos.UserProfileResponse profile = authService.updateProfile(
                authentication.getName(),
                name,
                profilePicture);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", profile));
    }

    @PostMapping(value = "/profile/multipart", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AuthDtos.UserProfileResponse>> updateProfileMultipartPost(
            Authentication authentication,
            @RequestParam(value = "name", required = false) String name,
            @RequestPart(value = "profilePicture", required = false) MultipartFile profilePicturePart,
            @RequestParam(value = "profilePicture", required = false) MultipartFile profilePictureParam) {
        return updateProfileMultipart(authentication, name, profilePicturePart, profilePictureParam);
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            Authentication authentication,
            @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        authService.changePassword(authentication.getName(), request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully."));
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<ApiResponse<String>> updateFcmToken(
            Authentication authentication,
            @Valid @RequestBody AuthDtos.FcmTokenRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        authService.updateFcmToken(authentication.getName(), request.getFcmToken());
        return ResponseEntity.ok(ApiResponse.success("FCM Token updated successfully."));
    }
}
