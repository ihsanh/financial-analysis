package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.Map;

@Schema(description = "Tek bir rasyo kuralının hesaplama sonucu")
public record RatioResultDto(
        @Schema(description = "Rasyo kural ID", example = "1")
        Long ruleId,

        @Schema(description = "Rasyo kural adı", example = "Cari Oran")
        String ruleName,

        @Schema(description = "Kategori", example = "LIQUIDITY")
        String category,

        @Schema(description = "Kullanılan formül", example = "{FI0010} / {FI0020}")
        String formula,

        @Schema(description = "Hesaplanan değer — hesaplama başarısızsa null", example = "1.8500")
        BigDecimal value,

        @Schema(description = "Hata mesajı — hesaplama başarılıysa null",
                example = "Kalem bulunamadı: FI0099")
        String error,

        @Schema(description = "Formüldeki her token için çözümlenen değer — hata ayıklama için",
                example = "{\"FI0010\": 137304000, \"FI0020\": 74200000}")
        Map<String, BigDecimal> resolvedValues
) {}
