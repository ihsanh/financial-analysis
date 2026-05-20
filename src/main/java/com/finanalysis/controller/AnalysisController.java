package com.finanalysis.controller;

import com.finanalysis.dto.AnalysisRequestDto;
import com.finanalysis.dto.AnalysisResponseDto;
import com.finanalysis.service.AnalysisService;
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
}
