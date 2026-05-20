package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Analiz sonucu")
public record AnalysisResponseDto(
        @Schema(description = "Firma ID", example = "1")
        Long companyId,

        @Schema(description = "Firma adı", example = "ABC Şirketi A.Ş.")
        String companyName,

        @Schema(description = "Analiz dönemi", example = "2025/9")
        String period,

        @Schema(description = "Rasyo hesaplama sonuçları — istekte ratioRuleIds boşsa boş liste döner")
        List<RatioResultDto> ratioResults,

        @Schema(description = "Düzeltme uygulama sonuçları — istekte adjustmentRuleIds boşsa boş liste döner")
        List<AdjustmentResultDto> adjustmentResults
) {}
