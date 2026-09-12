package com.brr.medi_pcr.Config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Map;

@Configuration
public class FirebaseConfig {

    @Autowired
    private ResourceLoader resourceLoader;

    @Autowired(required = false)
    private Environment environment;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
                            Map<String, Object> map = objectMapper.readValue(is, new TypeReference<Map<String, Object>>() {});

                            // Substitute placeholders from env / .env
                            replaceField(map, "project_id", "FIREBASE_PROJECT_ID", "my-medi-pcr");
                            replaceField(map, "private_key_id", "FIREBASE_PRIVATE_KEY_ID", null);
                            replaceField(map, "private_key", "FIREBASE_PRIVATE_KEY", null);
                            replaceField(map, "client_email", "FIREBASE_CLIENT_EMAIL", "firebase-adminsdk-fbsvc@my-medi-pcr.iam.gserviceaccount.com");
                            replaceField(map, "client_id", "FIREBASE_CLIENT_ID", null);

                            // Format PEM private key if \n is escaped
                            Object pkObj = map.get("private_key");
                            if (pkObj instanceof String pkStr && !pkStr.isBlank()) {
                                if (pkStr.contains("\\n")) {
                                    map.put("private_key", pkStr.replace("\\n", "\n"));
                                }
                            }

                            byte[] jsonBytes = objectMapper.writeValueAsBytes(map);
                            serviceAccountStream = new ByteArrayInputStream(jsonBytes);
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

    private void replaceField(Map<String, Object> map, String jsonKey, String envKey, String defaultValue) {
        String val = getEnvOrProperty(envKey);
        if (val != null && !val.isBlank()) {
            map.put(jsonKey, val);
        } else {
            Object cur = map.get(jsonKey);
            if (cur instanceof String s && s.startsWith("${") && s.endsWith("}")) {
                if (defaultValue != null) {
                    map.put(jsonKey, defaultValue);
                }
            }
        }
    }
}