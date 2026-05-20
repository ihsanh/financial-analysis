package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

@Schema(description = "Rasyo analizi kuralı")
public record RatioRuleDto(
        @Schema(description = "Kural ID — oluşturmada null bırakın", example = "1")
        Long id,

        @NotBlank
        @Schema(description = "Kural adı", example = "Cari Oran", requiredMode = Schema.RequiredMode.REQUIRED)
        String name,

        @Schema(description = "Açıklama", example = "Dönen varlıkların kısa vadeli yükümlülüklere oranı")
        String description,

        @NotBlank
        @Schema(description = "Formül — {KOD} token'leriyle yazılır",
                example = "{FI0010} / {FI0020}", requiredMode = Schema.RequiredMode.REQUIRED)
        String formula,

        @Schema(description = "Kategori: LIQUIDITY | LEVERAGE | PROFITABILITY | ACTIVITY | OTHER",
                example = "LIQUIDITY", allowableValues = {"LIQUIDITY", "LEVERAGE", "PROFITABILITY", "ACTIVITY", "OTHER"})
        String category,

        @Schema(description = "Sistem tarafından oluşturulan kural mı?", example = "false")
        Boolean isDefault,

        @Schema(description = "Aktif mi? false ise analizde kullanılmaz", example = "true")
        Boolean isActive,

        @Schema(description = "Değişken listesi (artık kullanılmıyor — boş liste gönderin)")
        List<RatioVariableDto> variables
) {}
