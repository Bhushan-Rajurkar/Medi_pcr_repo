package com.brr.medi_pcr.Config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Configuration
public class FirebaseConfig {

    @Autowired
    private ResourceLoader resourceLoader;

    @Autowired(required = false)
    private Environment environment;

    @Value("${firebase.config-path:classpath:my-medi-pcr-firebase-adminsdk-fbsvc-d963a4e80a.json}")
    private String firebaseConfigPath;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccountStream = null;

                // 1. Direct environment variable: Full raw JSON
                String envJson = getEnvOrProperty("FIREBASE_CREDENTIALS_JSON");
                if (envJson != null && !envJson.isBlank()) {
                    serviceAccountStream = new ByteArrayInputStream(envJson.getBytes(StandardCharsets.UTF_8));
                }

                // 2. Direct environment variable: Base64-encoded JSON
                if (serviceAccountStream == null) {
                    String envBase64 = getEnvOrProperty("FIREBASE_CREDENTIALS_BASE64");
                    if (envBase64 != null && !envBase64.isBlank()) {
                        byte[] decoded = Base64.getDecoder().decode(envBase64.trim());
                        serviceAccountStream = new ByteArrayInputStream(decoded);
                    }
                }

                // 3. Load template JSON file and replace placeholders with environment variables
                if (serviceAccountStream == null && firebaseConfigPath != null && !firebaseConfigPath.isBlank()) {
                    Resource resource = resourceLoader.getResource(firebaseConfigPath);
                    if (resource.exists()) {
                        try (InputStream is = resource.getInputStream()) {
                            String template = new String(is.readAllBytes(), StandardCharsets.UTF_8);

                            String projectId = getVal("FIREBASE_PROJECT_ID", "my-medi-pcr");
                            String privateKeyId = getVal("FIREBASE_PRIVATE_KEY_ID", "");
                            String rawPrivateKey = getVal("FIREBASE_PRIVATE_KEY", "");
                            String clientEmail = getVal("FIREBASE_CLIENT_EMAIL", "firebase-adminsdk-fbsvc@my-medi-pcr.iam.gserviceaccount.com");
                            String clientId = getVal("FIREBASE_CLIENT_ID", "");

                            // Ensure private key has escaped newlines for valid JSON
                            String formattedPrivateKey = formatPrivateKeyForJson(rawPrivateKey);

                            String resolved = template
                                    .replace("${FIREBASE_PROJECT_ID:my-medi-pcr}", projectId)
                                    .replace("${FIREBASE_PROJECT_ID}", projectId)
                                    .replace("${FIREBASE_PRIVATE_KEY_ID}", privateKeyId)
                                    .replace("${FIREBASE_PRIVATE_KEY}", formattedPrivateKey)
                                    .replace("${FIREBASE_CLIENT_EMAIL:firebase-adminsdk-fbsvc@my-medi-pcr.iam.gserviceaccount.com}", clientEmail)
                                    .replace("${FIREBASE_CLIENT_EMAIL}", clientEmail)
                                    .replace("${FIREBASE_CLIENT_ID}", clientId);

                            serviceAccountStream = new ByteArrayInputStream(resolved.getBytes(StandardCharsets.UTF_8));
                        }
                    }
                }

                if (serviceAccountStream == null) {
                    System.err.println("Firebase credentials not configured.");
                    return;
                }

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccountStream))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("Firebase initialized successfully.");
            }
        } catch (Exception e) {
            System.err.println("Failed to initialize Firebase: " + e.getMessage());
        }
    }

    private String getEnvOrProperty(String key) {
        String val = System.getenv(key);
        if (val == null || val.isBlank()) {
            val = System.getProperty(key);
        }
        if ((val == null || val.isBlank()) && environment != null) {
            val = environment.getProperty(key);
        }
        return val;
    }

    private String getVal(String key, String defaultVal) {
        String val = getEnvOrProperty(key);
        return (val != null && !val.isBlank()) ? val : defaultVal;
    }

    private String formatPrivateKeyForJson(String key) {
        if (key == null || key.isBlank()) {
            return "";
        }
        // Normalize newlines to literal \n for JSON embedding
        String normalized = key.replace("\r\n", "\n").replace("\r", "\n");
        if (normalized.contains("\n")) {
            normalized = normalized.replace("\n", "\\n");
        }
        return normalized;
    }
}