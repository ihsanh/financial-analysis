package com.finanalysis.dto;

import com.finanalysis.model.StatementType;
import java.time.LocalDateTime;
import java.util.List;

public record FinancialStatementDto(
    Long id,
    Long companyId,
    String companyName,
    StatementType type,
    String period,
    String fileName,
    LocalDateTime uploadedAt,
    List<FinancialLineItemDto> lineItems
) {}
