package com.finanalysis.dto;

import com.finanalysis.model.StatementType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Finansal tablo")
public record FinancialStatementDto(
        @Schema(description = "Tablo ID", example = "1")
        Long id,

        @Schema(description = "Firmaya ait ID", example = "1")
        Long companyId,

        @Schema(description = "Firma adı", example = "ABC Şirketi A.Ş.")
        String companyName,

        @Schema(description = "Tablo tipi")
        StatementType type,

        @Schema(description = "Dönem — YYYY/M formatı", example = "2025/9")
        String period,

        @Schema(description = "Yüklenen dosyanın adı", example = "bilanco_2025.xlsx")
        String fileName,

        @Schema(description = "Yüklenme zamanı")
        LocalDateTime uploadedAt,

        @Schema(description = "Kalem listesi — yalnızca GET /api/statements/{id} ile dolu gelir")
        List<FinancialLineItemDto> lineItems
) {}
