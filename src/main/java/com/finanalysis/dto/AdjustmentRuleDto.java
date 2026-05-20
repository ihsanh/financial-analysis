package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

@Schema(description = "Finansal tablo düzeltme kuralı")
public record AdjustmentRuleDto(
        @Schema(description = "Kural ID — oluşturmada null bırakın", example = "1")
        Long id,

        @NotBlank
        @Schema(description = "Kural adı", example = "FAVÖK Hesaplama", requiredMode = Schema.RequiredMode.REQUIRED)
        String name,

        @Schema(description = "Açıklama")
        String description,

        @Schema(description = "Aktif mi? false ise analizde kullanılmaz", example = "true")
        Boolean isActive,

        @Schema(description = "Sıralı düzeltme adımları — stepOrder'a göre işlenir")
        List<AdjustmentStepDto> steps
) {}
