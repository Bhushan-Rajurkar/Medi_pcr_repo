package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Dto.MedicineDtos;
import com.brr.medi_pcr.Dto.PrescriptionDtos;
import com.brr.medi_pcr.Service.MedicineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medicines")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MedicineController {

    private final MedicineService medicineService;

    /**
     * Add a new medicine manually with customized timings.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PrescriptionDtos.MedicineResponse>> addMedicine(
            Authentication authentication,
            @Valid @RequestBody MedicineDtos.ManualMedicineRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }

        PrescriptionDtos.MedicineResponse response = medicineService.addManualMedicine(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Medicine added successfully with custom reminders.", response));
    }

    /**
     * Update an existing medicine's timings, dosage, frequency, or instructions.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PrescriptionDtos.MedicineResponse>> updateMedicine(
            Authentication authentication,
            @PathVariable("id") Long id,
            @Valid @RequestBody MedicineDtos.ManualMedicineRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }

        PrescriptionDtos.MedicineResponse response = medicineService.updateMedicine(authentication.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Medicine and timings updated successfully.", response));
    }

    /**
     * Get all medicines for the authenticated user (optional status filter: ACTIVE, COMPLETED, STOPPED).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PrescriptionDtos.MedicineResponse>>> getMedicines(
            Authentication authentication,
            @RequestParam(value = "status", required = false) String status) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }

        List<PrescriptionDtos.MedicineResponse> list = medicineService.getUserMedicines(authentication.getName(), status);
        return ResponseEntity.ok(ApiResponse.success("Medicines retrieved successfully.", list));
    }

    /**
     * Get a specific medicine by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PrescriptionDtos.MedicineResponse>> getMedicineById(
            Authentication authentication,
            @PathVariable("id") Long id) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }

        PrescriptionDtos.MedicineResponse response = medicineService.getMedicineById(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Medicine details retrieved.", response));
    }

    /**
     * Delete a medicine by ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMedicine(
            Authentication authentication,
            @PathVariable("id") Long id) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }

        medicineService.deleteMedicine(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Medicine deleted successfully."));
    }

    /**
     * Quick status update (e.g. ACTIVE -> COMPLETED -> STOPPED).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<PrescriptionDtos.MedicineResponse>> updateStatus(
            Authentication authentication,
            @PathVariable("id") Long id,
            @Valid @RequestBody MedicineDtos.StatusUpdateRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Unauthorized"));
        }

        PrescriptionDtos.MedicineResponse response = medicineService.updateStatus(authentication.getName(), id, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Medicine status updated to " + request.getStatus(), response));
    }
}
