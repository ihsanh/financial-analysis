package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "AI finansal yorum yanıtı")
public record InterpretResponseDto(
        @Schema(description = "Gemini tarafından üretilen Türkçe finansal yorum metni")
        String interpretation
) {}
