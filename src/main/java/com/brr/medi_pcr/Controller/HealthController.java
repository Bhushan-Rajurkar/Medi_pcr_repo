package com.brr.medi_pcr.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class HealthController {

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired(required = false)
    private Environment environment;

    private static final long START_TIME = System.currentTimeMillis();

    /**
     * Health check endpoint to verify backend status, database connectivity, and uptime.
     * Accessible at:
     * - GET /api/v1.1/health
     * - GET /api/v1.1/status
     * - GET /api/v1.1/ping
     */
    @GetMapping({"/health", "/status", "/ping"})
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        boolean dbHealthy = false;
        String dbMessage = "Connected";

        if (dataSource != null) {
            try (Connection conn = dataSource.getConnection()) {
                dbHealthy = conn.isValid(3);
                if (!dbHealthy) {
                    dbMessage = "Connection invalid";
                }
            } catch (Exception e) {
                dbHealthy = false;
                dbMessage = "Connection failed: " + e.getMessage();
            }
        } else {
            dbMessage = "No DataSource configured";
        }

        String overallStatus = (dataSource == null || dbHealthy) ? "UP" : "DEGRADED";
        long uptimeSeconds = (System.currentTimeMillis() - START_TIME) / 1000;
        
        String[] activeProfiles = (environment != null && environment.getActiveProfiles().length > 0)
                ? environment.getActiveProfiles()
                : new String[]{"default"};

        response.put("status", overallStatus);
        response.put("service", "Medi-PCR Backend");
        response.put("uptimeSeconds", uptimeSeconds);
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("instant", Instant.now().toString());
        response.put("activeProfiles", Arrays.asList(activeProfiles));

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("databaseStatus", dbHealthy ? "UP" : "DOWN");
        details.put("databaseMessage", dbMessage);
        response.put("details", details);

        return ResponseEntity.ok(response);
    }
}
