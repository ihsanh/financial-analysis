package com.finanalysis.dto;

import java.math.BigDecimal;
import java.util.Map;

public record RatioResultDto(
    Long ruleId,
    String ruleName,
    String category,
    String formula,
    BigDecimal value,
    String error,
    Map<String, BigDecimal> resolvedValues
) {}
