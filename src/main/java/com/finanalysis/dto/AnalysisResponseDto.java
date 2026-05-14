package com.finanalysis.dto;

import java.util.List;

public record AnalysisResponseDto(
    Long companyId,
    String companyName,
    String period,
    List<RatioResultDto> ratioResults,
    List<AdjustmentResultDto> adjustmentResults
) {}
