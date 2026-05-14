package com.finanalysis.dto;

import java.math.BigDecimal;

public record FinancialLineItemDto(
    Long id,
    String code,
    String name,
    BigDecimal value,
    BigDecimal debitValue,
    BigDecimal creditValue,
    Integer level,
    String parentCode,
    Integer sortOrder
) {}
