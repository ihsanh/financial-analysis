package com.finanalysis.dto;

import java.math.BigDecimal;

public record RatioResultDto(
    Long ruleId,
    String ruleName,
    String category,
    String formula,
    BigDecimal value,
    String error
) {}
