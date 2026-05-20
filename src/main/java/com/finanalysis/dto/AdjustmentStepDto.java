package com.finanalysis.dto;

import com.finanalysis.model.StatementType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Düzeltme adımı — bir formülü çalıştırır ve sonucu outputCode altında saklar")
public record AdjustmentStepDto(
        @Schema(description = "Adım ID — oluşturmada null bırakın", example = "1")
        Long id,

        @Schema(description = "Üretilen kalemin kodu (sonraki adımlarda {outputCode} olarak kullanılabilir)",
                example = "ADJ_FAVOK", requiredMode = Schema.RequiredMode.REQUIRED)
        String outputCode,

        @Schema(description = "Üretilen kalemin görünen adı", example = "FAVÖK",
                requiredMode = Schema.RequiredMode.REQUIRED)
        String outputName,

        @Schema(description = "Formül — mevcut kalem kodları ve önceki adımların outputCode değerleri kullanılabilir",
                example = "{FI0050} + {FI0051} + {FI0052}", requiredMode = Schema.RequiredMode.REQUIRED)
        String formula,

        @Schema(description = "Kaynak tablo tipi (isteğe bağlı, belgeleme amaçlı)")
        StatementType sourceStatementType,

        @Schema(description = "Çalışma sırası — küçük sayı önce çalışır", example = "1",
                requiredMode = Schema.RequiredMode.REQUIRED)
        Integer stepOrder,

        @Schema(description = "Bu adımın ne yaptığına dair açıklama")
        String description
) {}
