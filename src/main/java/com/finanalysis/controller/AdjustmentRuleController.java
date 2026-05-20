package com.finanalysis.controller;

import com.finanalysis.dto.AdjustmentRuleDto;
import com.finanalysis.service.AdjustmentRuleService;
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

@Tag(name = "Düzeltme Kuralları", description = "Adım adım finansal tablo düzeltme kuralları")
@RestController
@RequestMapping("/api/adjustment-rules")
@RequiredArgsConstructor
public class AdjustmentRuleController {

    private final AdjustmentRuleService adjustmentRuleService;

    @Operation(summary = "Düzeltme kurallarını listele")
    @GetMapping
    public List<AdjustmentRuleDto> findAll(
            @Parameter(description = "true gönderilirse yalnızca aktif kurallar döner") @RequestParam(required = false) Boolean activeOnly) {
        return Boolean.TRUE.equals(activeOnly)
                ? adjustmentRuleService.findActive()
                : adjustmentRuleService.findAll();
    }

    @Operation(summary = "Düzeltme kuralı detayını getir")
    @ApiResponse(responseCode = "200", description = "Kural bulundu")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @GetMapping("/{id}")
    public AdjustmentRuleDto findById(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id) {
        return adjustmentRuleService.findById(id);
    }

    @Operation(summary = "Yeni düzeltme kuralı oluştur",
            description = """
                    Her adım (step) bir `outputCode` + `formula` çiftidir.

                    Adımlar sırayla çalışır; önceki adımın ürettiği kod (`outputCode`) sonraki adımın
                    formülünde `{KOD}` olarak kullanılabilir.

                    `stepOrder` sıralamayı belirler (1, 2, 3 …).
                    """)
    @ApiResponse(responseCode = "201", description = "Kural oluşturuldu")
    @ApiResponse(responseCode = "400", description = "Doğrulama hatası", content = @Content)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdjustmentRuleDto create(@Valid @RequestBody AdjustmentRuleDto dto) {
        return adjustmentRuleService.create(dto);
    }

    @Operation(summary = "Düzeltme kuralını güncelle")
    @ApiResponse(responseCode = "200", description = "Kural güncellendi")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @PutMapping("/{id}")
    public AdjustmentRuleDto update(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id,
            @Valid @RequestBody AdjustmentRuleDto dto) {
        return adjustmentRuleService.update(id, dto);
    }

    @Operation(summary = "Kuralı aktif/pasif yap",
            description = "isActive durumunu tersine çevirir.")
    @ApiResponse(responseCode = "200", description = "Durum güncellendi")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @PatchMapping("/{id}/toggle")
    public AdjustmentRuleDto toggleActive(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id) {
        return adjustmentRuleService.toggleActive(id);
    }

    @Operation(summary = "Düzeltme kuralını sil")
    @ApiResponse(responseCode = "204", description = "Silindi")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id) {
        adjustmentRuleService.delete(id);
    }
}
