package com.finanalysis.dto;

import com.finanalysis.model.StatementType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Finansal kalem tanımı — formül yazarken kullanılacak kod–isim eşleşmesi")
public record FinancialItemDefDto(
        @Schema(description = "Tanım ID", example = "1")
        Long id,

        @Schema(description = "Formüllerde kullanılan kalem kodu ({FI0001} şeklinde)", example = "FI0001")
        String code,

        @Schema(description = "Kalemin Excel'deki tam adı", example = "Toplam Dönen Varlıklar")
        String name,

        @Schema(description = "Kalemin ait olduğu tablo tipi")
        StatementType statementType,

        @Schema(description = "Excel girinti seviyesi — 0: bölüm başlığı, 1+: detay veya toplam kalemi",
                example = "1")
        Integer level
) {}
