package com.finanalysis.dto;

import java.util.List;
import java.util.Map;

public record AdjustmentResultDto(
    Long ruleId,
    String ruleName,
    List<FinancialLineItemDto> adjustedItems,
    Map<String, String> errors
) {}
