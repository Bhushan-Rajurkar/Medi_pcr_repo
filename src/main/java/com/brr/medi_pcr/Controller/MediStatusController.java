package com.brr.medi_pcr.Controller;

import com.brr.medi_pcr.Dto.ApiResponse;
import com.brr.medi_pcr.Dto.MediStatusDtos;
import com.brr.medi_pcr.Service.MediStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medistatus")
@CrossOrigin(origins = "*")
public class MediStatusController {

    @Autowired
    private MediStatusService mediStatusService;

    @PostMapping("/log")
    public ResponseEntity<ApiResponse<MediStatusDtos.LogResponse>> logStatus(
            Authentication authentication,
            @RequestBody MediStatusDtos.LogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        MediStatusDtos.LogResponse response = mediStatusService.logStatus(email, request);
        return ResponseEntity.ok(ApiResponse.success("Status recorded: " + response.getStatus(), response));
    }

    @PostMapping("/batch-log")
    public ResponseEntity<ApiResponse<List<MediStatusDtos.LogResponse>>> batchLogStatus(
            Authentication authentication,
            @RequestBody MediStatusDtos.BatchLogRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        List<MediStatusDtos.LogResponse> responses = mediStatusService.logBatchStatus(email, request);
        return ResponseEntity.ok(ApiResponse.success("Status recorded for " + responses.size() + " medicines", responses));
    }

    @GetMapping("/report")
    public ResponseEntity<ApiResponse<MediStatusDtos.ReportResponse>> getReport(
            Authentication authentication,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) String userEmail) {
        String email = authentication != null ? authentication.getName() : userEmail;
        MediStatusDtos.ReportResponse report = mediStatusService.getReport(email, days);
        return ResponseEntity.ok(ApiResponse.success("Report retrieved successfully", report));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<MediStatusDtos.LogResponse>>> getHistory(
            Authentication authentication,
            @RequestParam(required = false) String userEmail) {
        String email = authentication != null ? authentication.getName() : userEmail;
        List<MediStatusDtos.LogResponse> history = mediStatusService.getHistory(email);
        return ResponseEntity.ok(ApiResponse.success("History retrieved successfully", history));
    }

    @GetMapping("/tabular-report")
    public ResponseEntity<ApiResponse<MediStatusDtos.TabularReportResponse>> getTabularReport(
            Authentication authentication,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String userEmail) {
        String email = authentication != null ? authentication.getName() : userEmail;
        MediStatusDtos.TabularReportResponse report = mediStatusService.getTabularReport(email, days, category);
        return ResponseEntity.ok(ApiResponse.success("Tabular report retrieved successfully", report));
    }
}
