package com.finanalysis.dto;

import com.finanalysis.model.StatementType;

public record FinancialItemDefDto(Long id, String code, String name, StatementType statementType, Integer level) {}
