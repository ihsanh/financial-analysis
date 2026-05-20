package com.finanalysis.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Schema(description = "Firma bilgileri")
public record CompanyDto(
        @Schema(description = "Firma ID — oluşturmada null bırakın", example = "1")
        Long id,

        @NotBlank
        @Schema(description = "Firma unvanı", example = "ABC Şirketi A.Ş.", requiredMode = Schema.RequiredMode.REQUIRED)
        String name,

        @Pattern(regexp = "^\\d{10}$", message = "Vergi numarası 10 haneli rakamdan oluşmalıdır")
        @Schema(description = "Vergi numarası (10 hane)", example = "1234567890")
        String taxNumber,

        @Schema(description = "Faaliyet sektörü", example = "İmalat")
        String sector,

        @Schema(description = "Serbest açıklama")
        String description
) {}
