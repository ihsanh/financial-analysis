package com.finanalysis.controller;

import com.finanalysis.dto.AnalysisRequestDto;
import com.finanalysis.dto.AnalysisResponseDto;
import com.finanalysis.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;

    @PostMapping
    public AnalysisResponseDto analyze(@RequestBody AnalysisRequestDto request) {
        return analysisService.analyze(request);
    }
}
