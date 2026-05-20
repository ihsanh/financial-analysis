package com.finanalysis.controller;

import com.finanalysis.dto.CompanyDto;
import com.finanalysis.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Firma", description = "Firma oluşturma, güncelleme ve silme")
@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @Operation(summary = "Tüm firmaları listele")
    @GetMapping
    public List<CompanyDto> findAll() {
        return companyService.findAll();
    }

    @Operation(summary = "Firma detayını getir")
    @ApiResponse(responseCode = "200", description = "Firma bulundu")
    @ApiResponse(responseCode = "404", description = "Firma bulunamadı", content = @Content)
    @GetMapping("/{id}")
    public CompanyDto findById(
            @Parameter(description = "Firma ID", example = "1") @PathVariable Long id) {
        return companyService.findById(id);
    }

    @Operation(summary = "Yeni firma oluştur")
    @ApiResponse(responseCode = "201", description = "Firma oluşturuldu")
    @ApiResponse(responseCode = "400", description = "Doğrulama hatası", content = @Content)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyDto create(@Valid @RequestBody CompanyDto dto) {
        return companyService.create(dto);
    }

    @Operation(summary = "Firma bilgilerini güncelle")
    @ApiResponse(responseCode = "200", description = "Firma güncellendi")
    @ApiResponse(responseCode = "404", description = "Firma bulunamadı", content = @Content)
    @PutMapping("/{id}")
    public CompanyDto update(
            @Parameter(description = "Firma ID", example = "1") @PathVariable Long id,
            @Valid @RequestBody CompanyDto dto) {
        return companyService.update(id, dto);
    }

    @Operation(
            summary = "Firma sil",
            description = "Firmayı ve ilişkili tüm finansal tablolarını kalıcı olarak siler.")
    @ApiResponse(responseCode = "204", description = "Silindi")
    @ApiResponse(responseCode = "404", description = "Firma bulunamadı", content = @Content)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @Parameter(description = "Firma ID", example = "1") @PathVariable Long id) {
        companyService.delete(id);
    }
}
