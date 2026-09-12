package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Dto.PrescriptionDtos;
import com.brr.medi_pcr.Dto.PrescriptionRequestWrapper;
import com.brr.medi_pcr.Service.PrescriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/prescriptions")
@CrossOrigin(origins = "*")
public class PrescriptionController {

    @Autowired
    private PrescriptionService prescriptionService;

    // ==========================================
    // Save Extracted Prescription
    // ==========================================
    @PostMapping
    public ResponseEntity<ApiResponse<PrescriptionDtos.PrescriptionResponse>> savePrescription(
            @RequestBody PrescriptionRequestWrapper request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        PrescriptionDtos.PrescriptionResponse saved = prescriptionService.savePrescription(userEmail, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Prescription saved successfully", saved));
    }

    // ==========================================
    // List All Prescriptions of Logged-in User
    // ==========================================
    @GetMapping
    public ResponseEntity<ApiResponse<List<PrescriptionDtos.PrescriptionResponse>>> getMyPrescriptions(
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<PrescriptionDtos.PrescriptionResponse> prescriptions = prescriptionService.getUserPrescriptions(userEmail);
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved successfully", prescriptions));
    }

    // ==========================================
    // Get Single Prescription By ID
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PrescriptionDtos.PrescriptionResponse>> getPrescription(
            @PathVariable Long id,
            Authentication authentication) {

        String userEmail = authentication.getName();
        PrescriptionDtos.PrescriptionResponse prescription = prescriptionService.getPrescriptionById(userEmail, id);
        return ResponseEntity.ok(ApiResponse.success("Prescription retrieved successfully", prescription));
    }

    // ==========================================
    // Delete Prescription
    // ==========================================
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deletePrescription(
            @PathVariable Long id,
            Authentication authentication) {

        String userEmail = authentication.getName();
        prescriptionService.deletePrescription(userEmail, id);
        return ResponseEntity.ok(ApiResponse.success("Prescription deleted successfully"));
    }

    // ==========================================
    // List All Medicines (with optional status filter)
    // ==========================================
    @GetMapping("/medicines")
    public ResponseEntity<ApiResponse<List<PrescriptionDtos.MedicineResponse>>> getMyMedicines(
            @RequestParam(value = "status", required = false) String status,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<PrescriptionDtos.MedicineResponse> medicines = prescriptionService.getUserMedicines(userEmail, status);
        return ResponseEntity.ok(ApiResponse.success("Medicines retrieved successfully", medicines));
    }

    // ==========================================
    // Update Medicine Status (ACTIVE, COMPLETED, STOPPED)
    // ==========================================
    @PatchMapping("/medicines/{medicineId}/status")
    public ResponseEntity<ApiResponse<PrescriptionDtos.MedicineResponse>> updateMedicineStatus(
            @PathVariable Long medicineId,
            @RequestBody PrescriptionDtos.UpdateMedicineStatusRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        PrescriptionDtos.MedicineResponse updated = prescriptionService.updateMedicineStatus(
                userEmail,
                medicineId,
                request != null ? request.getStatus() : null);
        return ResponseEntity.ok(ApiResponse.success("Medicine status updated successfully", updated));
    }

    // ==========================================
    // Get Today's Scheduled Reminders
    // ==========================================
    @GetMapping("/reminders/today")
    public ResponseEntity<ApiResponse<List<PrescriptionDtos.ReminderResponse>>> getTodayReminders(
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<PrescriptionDtos.ReminderResponse> reminders = prescriptionService.getTodayReminders(userEmail);
        return ResponseEntity.ok(ApiResponse.success("Today's reminders retrieved successfully", reminders));
    }
}
