package com.finanalysis.controller;

import com.finanalysis.dto.FinancialStatementDto;
import com.finanalysis.model.StatementType;
import com.finanalysis.service.StatementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/statements")
@RequiredArgsConstructor
public class StatementController {

    private final StatementService statementService;

    @GetMapping
    public List<FinancialStatementDto> findByCompany(@RequestParam Long companyId) {
        return statementService.findByCompany(companyId);
    }

    @GetMapping("/{id}")
    public FinancialStatementDto findById(@PathVariable Long id) {
        return statementService.findById(id);
    }

    @GetMapping("/periods")
    public List<String> findPeriods(@RequestParam Long companyId) {
        return statementService.findPeriodsByCompany(companyId);
    }

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public FinancialStatementDto upload(
            @RequestParam Long companyId,
            @RequestParam String period,
            @RequestParam StatementType type,
            @RequestParam MultipartFile file) {
        return statementService.upload(companyId, period, type, file);
    }

    /** Reads all period columns from the Excel header row and creates/updates one statement per period. */
    @PostMapping("/upload-multi")
    @ResponseStatus(HttpStatus.CREATED)
    public List<FinancialStatementDto> uploadMulti(
            @RequestParam Long companyId,
            @RequestParam StatementType type,
            @RequestParam MultipartFile file) {
        return statementService.uploadMulti(companyId, type, file);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        statementService.delete(id);
    }
}
