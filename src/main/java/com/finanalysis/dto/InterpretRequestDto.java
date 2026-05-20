package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.Map;

@Schema(description = "AI finansal yorum isteği")
public record InterpretRequestDto(

        @Schema(description = "Firma adı", example = "ABC Şirketi A.Ş.")
        String companyName,

        @Schema(description = "Analiz edilen dönem(ler)", example = "[\"2025/9\",\"2024/9\"]")
        List<String> periods,

        @Schema(description = "Rasyo analizi satırları")
        List<RatioEntry> ratioRows,

        @Schema(description = "Arındırma/düzeltme sonuçları (isteğe bağlı)")
        List<AdjustmentEntry> adjustmentRows,

        @Schema(description = "Özet finansal tablo bölümleri (gelir tablosu, bilanço, nakit akımı)")
        List<SummaryTable> summaryTables
) {

    @Schema(description = "Tek bir rasyo kuralının çok dönemli sonucu")
    public record RatioEntry(
            @Schema(description = "Rasyo adı", example = "Cari Oran")
            String name,

            @Schema(description = "Kategori", example = "LIQUIDITY")
            String category,

            @Schema(description = "Dönem → hesaplanan değer", example = "{\"2025/9\": 1.85, \"2024/9\": 1.62}")
            Map<String, Double> periodValues,

            @Schema(description = "Dönem → hata mesajı (hesaplanamazsa)", example = "{\"2025/9\": \"Kalem bulunamadı: FI0099\"}")
            Map<String, String> errors
    ) {}

    @Schema(description = "Bir düzeltme kuralının ürettiği kalemler")
    public record AdjustmentEntry(
            @Schema(description = "Kural adı", example = "FAVÖK Hesaplama")
            String ruleName,

            @Schema(description = "Hesaplanan kalemler")
            List<AdjustedItem> items
    ) {}

    @Schema(description = "Düzeltme adımından üretilen kalem")
    public record AdjustedItem(
            @Schema(description = "Kalem adı", example = "FAVÖK")
            String name,

            @Schema(description = "Değer", example = "58518000.00")
            Double value
    ) {}

    @Schema(description = "Özet finansal tablo bölümü (gelir tablosu, bilanço veya nakit akımı)")
    public record SummaryTable(
            @Schema(description = "Tablo adı", example = "Gelir Tablosu")
            String tableType,

            @Schema(description = "Birinci dönem", example = "2025/9")
            String period1,

            @Schema(description = "İkinci dönem (karşılaştırma, isteğe bağlı)", example = "2024/9")
            String period2,

            @Schema(description = "Özet kalemler")
            List<SummaryItem> items
    ) {}

    @Schema(description = "Özet finansal kalem")
    public record SummaryItem(
            @Schema(description = "Kalem adı", example = "Net Dönem Karı")
            String label,

            @Schema(description = "Birinci dönem değeri")
            Double val1,

            @Schema(description = "İkinci dönem değeri")
            Double val2
    ) {}
}
