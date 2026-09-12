package com.brr.medi_pcr.Config;

import com.brr.medi_pcr.Entity.Role;
import com.brr.medi_pcr.Entity.User;
import com.brr.medi_pcr.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        try {
            String defaultAdminEmail = "admin@medipcr.com";
            userRepository.findByEmail(defaultAdminEmail).ifPresentOrElse(
                    existingAdmin -> {
                        existingAdmin.setRole(Role.ROLE_ADMIN);
                        existingAdmin.setEnabled(true);
                        existingAdmin.setPassword(passwordEncoder.encode("Admin@123456"));
                        userRepository.save(existingAdmin);
                        log.info("Default administrator account verified/synchronized: email='{}'", defaultAdminEmail);
                    },
                    () -> {
                        User admin = User.builder()
                                .name("System Administrator")
                                .email(defaultAdminEmail)
                                .password(passwordEncoder.encode("Admin@123456"))
                                .role(Role.ROLE_ADMIN)
                                .enabled(true)
                                .build();
                        userRepository.save(admin);
                        log.info("Default administrator account created: email='{}', password='{}'", defaultAdminEmail, "Admin@123456");
                    }
            );
        } catch (Exception e) {
            log.warn("AdminDataInitializer encountered an issue during startup: {}", e.getMessage());
        }
    }
}
