package com.finanalysis.dto;

import java.util.List;

public record AnalysisRequestDto(
    Long companyId,
    String period,
    List<Long> ratioRuleIds,
    List<Long> adjustmentRuleIds
) {}
