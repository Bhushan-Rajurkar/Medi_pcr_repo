package com.brr.medi_pcr.Service;

import com.brr.medi_pcr.Dto.AuthDtos;
import com.brr.medi_pcr.Entity.Role;
import com.brr.medi_pcr.Entity.SecureToken;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.SecureTokenRepository;
import com.brr.medi_pcr.Repository.UserRepository;
import com.brr.medi_pcr.Util.JwtUtil;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SecureTokenRepository tokenRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private Cloudinary cloudinary;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${server.servlet.context-path:/api/v1.1}")
    private String contextPath;

    // ==========================================
    // Registration
    // ==========================================
    @Transactional
    public void register(AuthDtos.RegisterRequest request, MultipartFile profilePicture) {
        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new RuntimeException("Email is already in use!");
        }

        String profilePictureUrl = request.getProfilePicture();

        // Upload to Cloudinary if a file is provided
        if (profilePicture != null && !profilePicture.isEmpty()) {
            try {
                Map<?, ?> uploadResult = cloudinary.uploader().upload(
                        profilePicture.getBytes(),
                        ObjectUtils.asMap("folder", "profile_pictures")
                );
                profilePictureUrl = uploadResult.get("secure_url").toString();
            } catch (Exception e) {
                throw new RuntimeException("Failed to upload profile picture: " + e.getMessage(), e);
            }
        }

        // Public registration always assigns standard ROLE_USER. Administrator accounts must be created by System Administrators.
        Role role = Role.ROLE_USER;

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .profilePicture(profilePictureUrl)
                .role(role)
                .enabled(false) // Must activate via email
                .build();

        user = userRepository.save(user);

        sendActivationEmail(user);
    }

    public void sendActivationEmail(User user) {
        String token = UUID.randomUUID().toString();
        SecureToken secureToken = SecureToken.builder()
                .token(token)
                .tokenType(SecureToken.TokenType.ACTIVATION)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(24))
                .build();
        tokenRepository.save(secureToken);

        String fullContextPath = contextPath.endsWith("/") ? contextPath.substring(0, contextPath.length() - 1) : contextPath;
        String activationLink = baseUrl + fullContextPath + "/auth/verify?token=" + token;
        
        emailService.sendEmail(
                user.getEmail(),
                "Verify Your Medi_PCR Account",
                "Hello " + user.getName() + ",\n\n" +
                "Thank you for registering on Medi_PCR. Please click the link below to activate your account:\n" +
                activationLink + "\n\n" +
                "This link will expire in 24 hours.\n\n" +
                "If you did not register for this account, please ignore this email."
        );
    }

    // ==========================================
    // Account Verification
    // ==========================================
    @Transactional
    public void verifyAccount(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new RuntimeException("Verification token is required.");
        }

        SecureToken secureToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired verification token."));

        if (secureToken.getTokenType() != SecureToken.TokenType.ACTIVATION) {
            throw new RuntimeException("Invalid token type.");
        }

        if (secureToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(secureToken);
            throw new RuntimeException("Verification token has expired. Please request a new verification email.");
        }

        User user = secureToken.getUser();
        user.setEnabled(true);
        userRepository.save(user);
        tokenRepository.delete(secureToken);
    }

    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        if (user.isEnabled()) {
            throw new RuntimeException("Account is already verified. You can log in.");
        }

        sendActivationEmail(user);
    }

    // ==========================================
    // Login
    // ==========================================
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        if (!user.isEnabled()) {
            throw new DisabledException("Account is not activated. Please verify your email first.");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid email or password.");
        }

        String jwt = jwtUtil.generateToken(email, user.getRole().name());

        return AuthDtos.AuthResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole().name())
                .profilePicture(user.getProfilePicture())
                .build();
    }

    // ==========================================
    // Forgot & Reset Password
    // ==========================================
    @Transactional
    public void triggerForgotPassword(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        String token = UUID.randomUUID().toString();
        SecureToken secureToken = SecureToken.builder()
                .token(token)
                .tokenType(SecureToken.TokenType.PASSWORD_RESET)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(1))
                .build();
        tokenRepository.save(secureToken);

        String fullContextPath = contextPath.endsWith("/") ? contextPath.substring(0, contextPath.length() - 1) : contextPath;
        String resetLink = baseUrl + fullContextPath + "/auth/reset-password?token=" + token;

        emailService.sendEmail(
                user.getEmail(),
                "Reset Your Password - Medi_PCR",
                "Hello " + user.getName() + ",\n\n" +
                "You requested a password reset. Please click the link below to set a new password:\n" +
                resetLink + "\n\n" +
                "This link will expire in 1 hour.\n\n" +
                "If you did not request a password reset, please ignore this email."
        );
    }

    public boolean validateResetToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        return tokenRepository.findByToken(token)
                .filter(t -> t.getTokenType() == SecureToken.TokenType.PASSWORD_RESET)
                .filter(t -> t.getExpiryDate().isAfter(LocalDateTime.now()))
                .isPresent();
    }

    @Transactional
    public void completePasswordReset(String token, String newPassword) {
        if (token == null || token.trim().isEmpty()) {
            throw new RuntimeException("Reset token is required.");
        }

        SecureToken secureToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired password reset token."));

        if (secureToken.getTokenType() != SecureToken.TokenType.PASSWORD_RESET) {
            throw new RuntimeException("Invalid token type.");
        }

        if (secureToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(secureToken);
            throw new RuntimeException("Password reset token has expired. Please request a new one.");
        }

        User user = secureToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.delete(secureToken);
    }

    // ==========================================
    // Change Password
    // ==========================================
    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    // ==========================================
    // User Profile Management
    // ==========================================
    public AuthDtos.UserProfileResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return AuthDtos.UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .profilePicture(user.getProfilePicture())
                .enabled(user.isEnabled())
                .fcmToken(user.getFcmToken())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    @Transactional
    public AuthDtos.UserProfileResponse updateProfile(String email, String name, MultipartFile profilePicture) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        if (name != null && !name.trim().isEmpty()) {
            user.setName(name.trim());
        }

        if (profilePicture != null && !profilePicture.isEmpty()) {
            try {
                Map<?, ?> uploadResult = cloudinary.uploader().upload(
                        profilePicture.getBytes(),
                        ObjectUtils.asMap("folder", "profile_pictures")
                );
                user.setProfilePicture(uploadResult.get("secure_url").toString());
            } catch (Exception e) {
                throw new RuntimeException("Failed to upload profile picture: " + e.getMessage(), e);
            }
        }

        User updatedUser = userRepository.save(user);

        return AuthDtos.UserProfileResponse.builder()
                .id(updatedUser.getId())
                .name(updatedUser.getName())
                .email(updatedUser.getEmail())
                .role(updatedUser.getRole().name())
                .profilePicture(updatedUser.getProfilePicture())
                .enabled(updatedUser.isEnabled())
                .fcmToken(updatedUser.getFcmToken())
                .createdAt(updatedUser.getCreatedAt())
                .updatedAt(updatedUser.getUpdatedAt())
                .build();
    }

    // ==========================================
    // FCM Token
    // ==========================================
    @Transactional
    public void updateFcmToken(String email, String fcmToken) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        if (fcmToken == null || fcmToken.isBlank()) return;

        user.setFcmToken(fcmToken.trim());
        userRepository.save(user);
    }

    public User getCurrentProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new RuntimeException("User is not authenticated.");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found with email: " + authentication.getName()));
    }
}