package com.finanalysis.controller;

import com.finanalysis.dto.FinancialStatementDto;
import com.finanalysis.model.StatementType;
import com.finanalysis.service.StatementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Finansal Tablolar", description = "Excel yükleme, dönem listeleme ve kalem görüntüleme")
@RestController
@RequestMapping("/api/statements")
@RequiredArgsConstructor
public class StatementController {

    private final StatementService statementService;

    @Operation(summary = "Firmaya ait tüm tabloları listele",
            description = "Belirtilen firmaya ait tüm finansal tabloları (bilanço, gelir tablosu, mizan) döner. " +
                    "lineItems alanı bu endpointte boş gelir; detay için `GET /api/statements/{id}` kullanın.")
    @GetMapping
    public List<FinancialStatementDto> findByCompany(
            @Parameter(description = "Firma ID", required = true, example = "1") @RequestParam Long companyId) {
        return statementService.findByCompany(companyId);
    }

    @Operation(summary = "Tablo detayını kalem listesiyle getir",
            description = "Finansal tablonun tüm kalemlerini (lineItems) döner.")
    @ApiResponse(responseCode = "200", description = "Tablo bulundu")
    @ApiResponse(responseCode = "404", description = "Tablo bulunamadı", content = @Content)
    @GetMapping("/{id}")
    public FinancialStatementDto findById(
            @Parameter(description = "Tablo ID", example = "1") @PathVariable Long id) {
        return statementService.findById(id);
    }

    @Operation(summary = "Firmaya ait dönemleri listele",
            description = "Firmaya ait finansal tablolarda kullanılan tüm dönemleri döner. Format: `YYYY/M`")
    @GetMapping("/periods")
    public List<String> findPeriods(
            @Parameter(description = "Firma ID", required = true, example = "1") @RequestParam Long companyId) {
        return statementService.findPeriodsByCompany(companyId);
    }

    @Operation(summary = "Tek dönemlik tablo yükle",
            description = "Excel dosyasını belirtilen dönem ve tablo tipiyle yükler. " +
                    "Aynı firma + dönem + tip kombinasyonu varsa günceller.")
    @ApiResponse(responseCode = "201", description = "Tablo yüklendi")
    @ApiResponse(responseCode = "400", description = "Geçersiz dosya veya parametreler", content = @Content)
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FinancialStatementDto upload(
            @Parameter(description = "Firma ID", required = true, example = "1") @RequestParam Long companyId,
            @Parameter(description = "Dönem (YYYY/M)", required = true, example = "2025/9") @RequestParam String period,
            @Parameter(description = "Tablo tipi", required = true) @RequestParam StatementType type,
            @Parameter(description = "Excel dosyası (.xlsx)", required = true) @RequestParam MultipartFile file) {
        return statementService.upload(companyId, period, type, file);
    }

    @Operation(summary = "Çok dönemli tablo yükle",
            description = "Excel dosyasının başlık satırındaki dönem sütunlarını otomatik okur ve " +
                    "her dönem için ayrı bir tablo kaydı oluşturur / günceller.")
    @ApiResponse(responseCode = "201", description = "Tablolar yüklendi")
    @ApiResponse(responseCode = "400", description = "Geçersiz dosya veya parametreler", content = @Content)
    @PostMapping(value = "/upload-multi", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public List<FinancialStatementDto> uploadMulti(
            @Parameter(description = "Firma ID", required = true, example = "1") @RequestParam Long companyId,
            @Parameter(description = "Tablo tipi", required = true) @RequestParam StatementType type,
            @Parameter(description = "Çok dönemli Excel dosyası (.xlsx)", required = true) @RequestParam MultipartFile file) {
        return statementService.uploadMulti(companyId, type, file);
    }

    @Operation(summary = "Finansal tablo sil")
    @ApiResponse(responseCode = "204", description = "Silindi")
    @ApiResponse(responseCode = "404", description = "Tablo bulunamadı", content = @Content)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @Parameter(description = "Tablo ID", example = "1") @PathVariable Long id) {
        statementService.delete(id);
    }
}
