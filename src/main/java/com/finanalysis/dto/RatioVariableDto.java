package com.finanalysis.dto;

import com.finanalysis.model.StatementType;

public record RatioVariableDto(
    Long id,
    String variableName,
    StatementType statementType,
    String lineItemCode,
    String aggregation
) {}
