package com.finanalysis.controller;

import com.finanalysis.dto.AnalysisRequestDto;
import com.finanalysis.dto.AnalysisResponseDto;
import com.finanalysis.dto.InterpretRequestDto;
import com.finanalysis.dto.InterpretResponseDto;
import com.finanalysis.service.AnalysisService;
import com.finanalysis.service.GeminiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Analiz", description = "Rasyo ve düzeltme hesaplamalarını tek seferde çalıştırma")
@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;
    private final GeminiService geminiService;

    @Operation(
            summary = "Analiz çalıştır",
            description = """
                    Seçili firma ve dönem için rasyo hesaplamaları ile düzeltme adımlarını çalıştırır.

                    - `ratioRuleIds` — hesaplanacak rasyo kurallarının ID listesi (boş liste = rasyo yok)
                    - `adjustmentRuleIds` — uygulanacak düzeltme kurallarının ID listesi (boş liste = düzeltme yok)

                    Hesaplama başarısız olan kalemler `error` alanı dolu, `value` alanı null olarak döner;
                    diğer kalemler etkilenmez.
                    """)
    @ApiResponse(responseCode = "200", description = "Analiz tamamlandı")
    @ApiResponse(responseCode = "400", description = "Firma veya dönem bulunamadı", content = @Content)
    @PostMapping
    public AnalysisResponseDto analyze(@RequestBody AnalysisRequestDto request) {
        return analysisService.analyze(request);
    }

    @Operation(
            summary = "AI finansal yorum üret",
            description = """
                    Rasyo analizi ve arındırma sonuçlarını Gemini'ye göndererek Türkçe finansal yorum üretir.

                    Yorum şu başlıkları kapsar:
                    Genel finansal sağlık · Likidite · Borç/kaldıraç · Karlılık ·
                    Güçlü yönler · Riskler · Öneriler

                    **Gereksinim:** `GEMINI_API_KEY` ortam değişkeni (veya `gemini.api-key` özelliği) tanımlı olmalıdır.
                    """)
    @ApiResponse(responseCode = "200", description = "Yorum üretildi")
    @ApiResponse(responseCode = "400", description = "API anahtarı eksik veya istek geçersiz", content = @Content)
    @ApiResponse(responseCode = "500", description = "Gemini API hatası", content = @Content)
    @PostMapping("/interpret")
    public InterpretResponseDto interpret(@RequestBody InterpretRequestDto request) {
        return new InterpretResponseDto(geminiService.interpret(request));
    }
}
