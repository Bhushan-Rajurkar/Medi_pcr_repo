package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Dto.ProfileDtos;
import com.brr.medi_pcr.Service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProfileController {

    private final ProfileService profileService;

    // =========================================================================
    // Authenticated Endpoints (For User to Manage Profile & View Own QR Code)
    // =========================================================================

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ProfileDtos.ProfileResponseDto>> getMyProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        ProfileDtos.ProfileResponseDto profile = profileService.getProfileByUserEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    @PostMapping("/save")
    public ResponseEntity<ApiResponse<ProfileDtos.ProfileResponseDto>> saveProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileDtos.ProfileRequestDto request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        ProfileDtos.ProfileResponseDto saved = profileService.saveOrUpdateProfile(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile completed successfully. Emergency QR code generated.", saved));
    }

    @PostMapping("/regenerate-qr")
    public ResponseEntity<ApiResponse<ProfileDtos.ProfileResponseDto>> regenerateQr(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }
        ProfileDtos.ProfileResponseDto updated = profileService.regenerateQrCode(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("New emergency QR code generated.", updated));
    }

    // =========================================================================
    // Public Endpoints (Accessible to Anyone Scanning the QR Code - No Auth Required)
    // =========================================================================

    /**
     * Public JSON emergency details endpoint.
     */
    @GetMapping("/public/{qrCodeToken}")
    public ResponseEntity<ApiResponse<ProfileDtos.PublicEmergencyProfileDto>> getPublicEmergencyProfile(
            @PathVariable("qrCodeToken") String qrCodeToken) {
        ProfileDtos.PublicEmergencyProfileDto emergencyData = profileService.getPublicEmergencyProfile(qrCodeToken);
        return ResponseEntity.ok(ApiResponse.success("Emergency medical profile retrieved", emergencyData));
    }

    /**
     * Direct QR Code Image stream (PNG) for download or embedding.
     */
    @GetMapping(value = "/public/{qrCodeToken}/qr-image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQrCodeImage(@PathVariable("qrCodeToken") String qrCodeToken) {
        byte[] imageBytes = profileService.getQrCodeImageBytes(qrCodeToken);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentDispositionFormData("inline", "emergency_qr_" + qrCodeToken + ".png");
        return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);
    }

    /**
     * Standalone, mobile-responsive HTML Emergency Medical Card.
     * When any mobile device or QR scanner camera scans the QR code, this page opens
     * immediately in their browser showing vital emergency contacts, blood group, allergies,
     * and 1-tap calling buttons.
     */
    @GetMapping(value = "/emergency/{qrCodeToken}/view", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> viewEmergencyCardHtml(@PathVariable("qrCodeToken") String qrCodeToken) {
        ProfileDtos.PublicEmergencyProfileDto data = profileService.getPublicEmergencyProfile(qrCodeToken);

        String bloodGroupBadge = data.getBloodGroup() != null && !data.getBloodGroup().isEmpty()
                ? "<span class='badge blood-badge'>🩸 Blood Group: " + escapeHtml(data.getBloodGroup()) + "</span>"
                : "";

        StringBuilder allergiesHtml = new StringBuilder();
        List<String> allergies = data.getAllergies();
        if (allergies != null && !allergies.isEmpty()) {
            allergiesHtml.append("<div class='section allergy-section'>");
            allergiesHtml.append("<h3 class='section-title warning-title'>⚠️ Known Allergies & Medical Warnings</h3>");
            allergiesHtml.append("<div class='tags-container'>");
            for (String allergy : allergies) {
                allergiesHtml.append("<span class='tag allergy-tag'>").append(escapeHtml(allergy)).append("</span>");
            }
            allergiesHtml.append("</div></div>");
        } else {
            allergiesHtml.append("<div class='section'>");
            allergiesHtml.append("<h3 class='section-title'>Known Allergies</h3>");
            allergiesHtml.append("<p class='empty-text'>No known allergies reported.</p>");
            allergiesHtml.append("</div>");
        }

        String photoHtml = data.getProfilePicture() != null && !data.getProfilePicture().trim().isEmpty()
                ? "<img src='" + escapeHtml(data.getProfilePicture()) + "' class='avatar' alt='Patient Photo'/>"
                : "<div class='avatar-placeholder'>👤</div>";

        String html = "<!DOCTYPE html>\n" +
                "<html lang='en'>\n" +
                "<head>\n" +
                "  <meta charset='UTF-8'>\n" +
                "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n" +
                "  <title>Emergency Medical Card - " + escapeHtml(data.getName()) + "</title>\n" +
                "  <style>\n" +
                "    :root {\n" +
                "      --primary: #059669;\n" +
                "      --danger: #dc2626;\n" +
                "      --danger-bg: #fef2f2;\n" +
                "      --warning: #d97706;\n" +
                "      --bg: #f8fafc;\n" +
                "      --card-bg: #ffffff;\n" +
                "      --text: #0f172a;\n" +
                "      --text-muted: #64748b;\n" +
                "      --border: #e2e8f0;\n" +
                "    }\n" +
                "    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }\n" +
                "    body { background-color: var(--bg); color: var(--text); padding: 16px; display: flex; justify-content: center; min-height: 100vh; }\n" +
                "    .container { width: 100%; max-width: 540px; margin: 0 auto; }\n" +
                "    .emergency-banner {\n" +
                "      background: linear-gradient(135deg, #dc2626, #b91c1c);\n" +
                "      color: white;\n" +
                "      padding: 14px 20px;\n" +
                "      border-radius: 16px 16px 0 0;\n" +
                "      display: flex;\n" +
                "      align-items: center;\n" +
                "      gap: 12px;\n" +
                "      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);\n" +
                "    }\n" +
                "    .banner-icon { font-size: 28px; animation: pulse 1.5s infinite; }\n" +
                "    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }\n" +
                "    .banner-text h1 { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }\n" +
                "    .banner-text p { font-size: 12px; opacity: 0.9; }\n" +
                "    .card {\n" +
                "      background: var(--card-bg);\n" +
                "      border: 1px solid var(--border);\n" +
                "      border-top: none;\n" +
                "      border-radius: 0 0 16px 16px;\n" +
                "      padding: 24px;\n" +
                "      box-shadow: 0 10px 25px rgba(0,0,0,0.06);\n" +
                "    }\n" +
                "    .patient-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }\n" +
                "    .avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid #10b981; }\n" +
                "    .avatar-placeholder { width: 72px; height: 72px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 32px; }\n" +
                "    .patient-info h2 { font-size: 22px; font-weight: 700; color: var(--text); }\n" +
                "    .patient-info p { font-size: 13px; color: var(--text-muted); margin-top: 2px; }\n" +
                "    .badges-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }\n" +
                "    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }\n" +
                "    .blood-badge { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }\n" +
                "    .vitals-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }\n" +
                "    .vital-item { background: #f1f5f9; padding: 12px; border-radius: 10px; border-left: 3px solid var(--primary); }\n" +
                "    .vital-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }\n" +
                "    .vital-value { font-size: 15px; font-weight: 700; color: var(--text); margin-top: 2px; }\n" +
                "    .section { margin-bottom: 20px; }\n" +
                "    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #334155; display: flex; align-items: center; gap: 6px; }\n" +
                "    .warning-title { color: #b91c1c; }\n" +
                "    .action-card { background: #ffffff; border: 1.5px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; }\n" +
                "    .action-card:hover { border-color: var(--primary); transform: translateY(-1px); }\n" +
                "    .contact-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); }\n" +
                "    .contact-name { font-size: 16px; font-weight: 700; color: var(--text); }\n" +
                "    .contact-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }\n" +
                "    .call-btn { display: inline-flex; align-items: center; gap: 6px; background: #059669; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3); }\n" +
                "    .call-btn.guardian { background: #dc2626; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3); }\n" +
                "    .tags-container { display: flex; flex-wrap: wrap; gap: 6px; }\n" +
                "    .tag { padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; }\n" +
                "    .allergy-tag { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }\n" +
                "    .empty-text { font-size: 13px; color: var(--text-muted); font-style: italic; }\n" +
                "    .footer-note { text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 20px; line-height: 1.5; }\n" +
                "  </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "  <div class='container'>\n" +
                "    <div class='emergency-banner'>\n" +
                "      <div class='banner-icon'>🚨</div>\n" +
                "      <div class='banner-text'>\n" +
                "        <h1>Emergency Medical Profile</h1>\n" +
                "        <p>Medi-PCR Verified Clinical Emergency Information</p>\n" +
                "      </div>\n" +
                "    </div>\n" +
                "    <div class='card'>\n" +
                "      <div class='patient-header'>\n" +
                "        " + photoHtml + "\n" +
                "        <div class='patient-info'>\n" +
                "          <h2>" + escapeHtml(data.getName()) + "</h2>\n" +
                "          <p>📞 Patient: <a href='tel:" + escapeHtml(data.getContactNumber()) + "' style='color: inherit; font-weight: 600;'>" + escapeHtml(data.getContactNumber()) + "</a></p>\n" +
                "          <p>📍 " + escapeHtml(data.getAddress()) + "</p>\n" +
                "          <div class='badges-row'>" + bloodGroupBadge + "</div>\n" +
                "        </div>\n" +
                "      </div>\n" +
                "\n" +
                "      <!-- Emergency Contacts -->\n" +
                "      <div class='section'>\n" +
                "        <h3 class='section-title'>🚨 Primary Emergency Contacts</h3>\n" +
                "        \n" +
                "        <!-- Guardian Card -->\n" +
                "        <div class='action-card'>\n" +
                "          <div>\n" +
                "            <div class='contact-title'>Guardian / Emergency Contact</div>\n" +
                "            <div class='contact-name'>" + escapeHtml(data.getGuardianName()) + "</div>\n" +
                "            <div class='contact-sub'>📍 " + escapeHtml(data.getGuardianAddress()) + "</div>\n" +
                "          </div>\n" +
                "          <a href='tel:" + escapeHtml(data.getGuardianContact()) + "' class='call-btn guardian'>📞 Call Now</a>\n" +
                "        </div>\n" +
                "\n" +
                "        <!-- Doctor Card -->\n" +
                "        <div class='action-card'>\n" +
                "          <div>\n" +
                "            <div class='contact-title'>Primary Physician / Doctor</div>\n" +
                "            <div class='contact-name'>Dr. " + escapeHtml(data.getDoctorName()) + "</div>\n" +
                "            <div class='contact-sub'>📞 " + escapeHtml(data.getDoctorContact()) + "</div>\n" +
                "          </div>\n" +
                "          <a href='tel:" + escapeHtml(data.getDoctorContact()) + "' class='call-btn'>👨‍⚕️ Call Doctor</a>\n" +
                "        </div>\n" +
                "      </div>\n" +
                "\n" +
                "      <!-- Allergies & Warnings -->\n" +
                "      " + allergiesHtml.toString() + "\n" +
                "\n" +
                "      <!-- Health Metrics -->\n" +
                "      <div class='section'>\n" +
                "        <h3 class='section-title'>❤️ Recorded Health Metrics</h3>\n" +
                "        <div class='vitals-grid'>\n" +
                "          <div class='vital-item'>\n" +
                "            <div class='vital-label'>Blood Pressure</div>\n" +
                "            <div class='vital-value'>" + (data.getBloodPressure() != null ? escapeHtml(data.getBloodPressure()) : "N/A") + "</div>\n" +
                "          </div>\n" +
                "          <div class='vital-item'>\n" +
                "            <div class='vital-label'>Heart Rate</div>\n" +
                "            <div class='vital-value'>" + (data.getHeartRate() != null ? escapeHtml(data.getHeartRate()) + " bpm" : "N/A") + "</div>\n" +
                "          </div>\n" +
                "          <div class='vital-item'>\n" +
                "            <div class='vital-label'>Age / Height</div>\n" +
                "            <div class='vital-value'>" + (data.getAge() != null ? data.getAge() + " yrs" : "-") + " / " + (data.getHeight() != null ? data.getHeight() + " cm" : "-") + "</div>\n" +
                "          </div>\n" +
                "          <div class='vital-item'>\n" +
                "            <div class='vital-label'>Weight</div>\n" +
                "            <div class='vital-value'>" + (data.getWeight() != null ? data.getWeight() + " kg" : "N/A") + "</div>\n" +
                "          </div>\n" +
                "        </div>\n" +
                "      </div>\n" +
                "\n" +
                "      <p class='footer-note'>Medi-PCR Emergency Medical ID &bull; Secure Emergency Dispatch Support &bull; Unique ID: " + escapeHtml(qrCodeToken) + "</p>\n" +
                "    </div>\n" +
                "  </div>\n" +
                "</body>\n" +
                "</html>";

        return ResponseEntity.ok(html);
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
}
