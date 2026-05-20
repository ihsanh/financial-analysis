package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.Map;

@Schema(description = "Tek bir düzeltme kuralının uygulama sonucu")
public record AdjustmentResultDto(
        @Schema(description = "Düzeltme kural ID", example = "1")
        Long ruleId,

        @Schema(description = "Düzeltme kural adı", example = "FAVÖK Hesaplama")
        String ruleName,

        @Schema(description = "Başarıyla hesaplanan kalemler — her adımın outputCode ve değerini içerir")
        List<FinancialLineItemDto> adjustedItems,

        @Schema(description = "Başarısız adımlar — anahtar: outputCode, değer: hata mesajı",
                example = "{\"ADJ_FAVOK\": \"Kalem bulunamadı: FI0099\"}")
        Map<String, String> errors
) {}
