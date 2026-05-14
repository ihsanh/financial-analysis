package com.finanalysis.dto;

import com.finanalysis.model.StatementType;

public record AdjustmentStepDto(
    Long id,
    String outputCode,
    String outputName,
    String formula,
    StatementType sourceStatementType,
    Integer stepOrder,
    String description
) {}
