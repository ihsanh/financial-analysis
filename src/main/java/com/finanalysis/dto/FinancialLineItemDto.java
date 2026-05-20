package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Finansal tablo kalemi")
public record FinancialLineItemDto(
        @Schema(description = "Kalem ID", example = "101")
        Long id,

        @Schema(description = "Sistem tarafından atanan kalem kodu (formüllerde {KOD} olarak kullanılır)",
                example = "FI0001")
        String code,

        @Schema(description = "Kalemin Excel'deki adı", example = "Dönen Varlıklar")
        String name,

        @Schema(description = "Kalem değeri (bilanço veya gelir tablosu kalemleri için)", example = "137304000.00")
        BigDecimal value,

        @Schema(description = "Borç tutarı (yalnızca mizan kalemleri için)", example = "50000000.00")
        BigDecimal debitValue,

        @Schema(description = "Alacak tutarı (yalnızca mizan kalemleri için)", example = "50000000.00")
        BigDecimal creditValue,

        @Schema(description = "Excel'deki girinti seviyesi — 0: bölüm başlığı, 1+: alt kalem veya toplam",
                example = "1")
        Integer level,

        @Schema(description = "Üst kalemin kodu (varsa)", example = "FI0000")
        String parentCode,

        @Schema(description = "Sıralama numarası", example = "10")
        Integer sortOrder
) {}
