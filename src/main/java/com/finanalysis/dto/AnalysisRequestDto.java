package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Analiz isteği")
public record AnalysisRequestDto(

        @Schema(description = "Analiz yapılacak firma ID", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        Long companyId,

        @Schema(description = "Dönem — YYYY/M formatında", example = "2025/9", requiredMode = Schema.RequiredMode.REQUIRED)
        String period,

        @Schema(description = "Hesaplanacak rasyo kuralı ID'leri (boş liste gönderilirse rasyo hesaplanmaz)",
                example = "[1, 2, 3]")
        List<Long> ratioRuleIds,

        @Schema(description = "Uygulanacak düzeltme kuralı ID'leri (boş liste gönderilirse düzeltme yapılmaz)",
                example = "[1]")
        List<Long> adjustmentRuleIds
) {}
