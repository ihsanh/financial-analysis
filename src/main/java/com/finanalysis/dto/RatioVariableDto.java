package com.finanalysis.dto;

import com.finanalysis.model.StatementType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Rasyo değişkeni (eski yapı — yeni kurallarda kullanılmıyor)")
public record RatioVariableDto(
        @Schema(description = "Değişken ID", example = "1")
        Long id,

        @Schema(description = "Formüldeki değişken adı", example = "A")
        String variableName,

        @Schema(description = "Kalemin alındığı tablo tipi")
        StatementType statementType,

        @Schema(description = "Kalem kodu", example = "FI0001")
        String lineItemCode,

        @Schema(description = "Toplama yöntemi (kullanılmıyor)", example = "SUM")
        String aggregation
) {}
