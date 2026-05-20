package com.finanalysis.controller;

import com.finanalysis.dto.RatioRuleDto;
import com.finanalysis.service.RatioRuleService;
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

@Tag(name = "Rasyo Kuralları", description = "Formül bazlı oran analizi kuralları")
@RestController
@RequestMapping("/api/ratio-rules")
@RequiredArgsConstructor
public class RatioRuleController {

    private final RatioRuleService ratioRuleService;

    @Operation(summary = "Rasyo kurallarını listele")
    @GetMapping
    public List<RatioRuleDto> findAll(
            @Parameter(description = "true gönderilirse yalnızca aktif kurallar döner") @RequestParam(required = false) Boolean activeOnly) {
        return Boolean.TRUE.equals(activeOnly) ? ratioRuleService.findActive() : ratioRuleService.findAll();
    }

    @Operation(summary = "Rasyo kuralı detayını getir")
    @ApiResponse(responseCode = "200", description = "Kural bulundu")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @GetMapping("/{id}")
    public RatioRuleDto findById(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id) {
        return ratioRuleService.findById(id);
    }

    @Operation(summary = "Yeni rasyo kuralı oluştur",
            description = """
                    Formül `{KOD}` token'leri ile yazılır. Örnek: `{FI0001} / {FI0002}`

                    `variables` alanı artık kullanılmamaktadır; formül token'leri analiz sırasında
                    otomatik çözümlenir. Boş liste gönderin.

                    `category` için geçerli değerler: `LIQUIDITY`, `LEVERAGE`, `PROFITABILITY`, `ACTIVITY`, `OTHER`
                    """)
    @ApiResponse(responseCode = "201", description = "Kural oluşturuldu")
    @ApiResponse(responseCode = "400", description = "Doğrulama hatası", content = @Content)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RatioRuleDto create(@Valid @RequestBody RatioRuleDto dto) {
        return ratioRuleService.create(dto);
    }

    @Operation(summary = "Rasyo kuralını güncelle")
    @ApiResponse(responseCode = "200", description = "Kural güncellendi")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @PutMapping("/{id}")
    public RatioRuleDto update(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id,
            @Valid @RequestBody RatioRuleDto dto) {
        return ratioRuleService.update(id, dto);
    }

    @Operation(summary = "Kuralı aktif/pasif yap",
            description = "isActive durumunu tersine çevirir.")
    @ApiResponse(responseCode = "200", description = "Durum güncellendi")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @PatchMapping("/{id}/toggle")
    public RatioRuleDto toggleActive(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id) {
        return ratioRuleService.toggleActive(id);
    }

    @Operation(summary = "Rasyo kuralını sil")
    @ApiResponse(responseCode = "204", description = "Silindi")
    @ApiResponse(responseCode = "404", description = "Kural bulunamadı", content = @Content)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @Parameter(description = "Kural ID", example = "1") @PathVariable Long id) {
        ratioRuleService.delete(id);
    }
}
