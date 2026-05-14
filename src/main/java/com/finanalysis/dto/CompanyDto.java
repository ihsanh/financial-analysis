package com.finanalysis.dto;

import jakarta.validation.constraints.NotBlank;

public record CompanyDto(
    Long id,
    @NotBlank String name,
    String taxNumber,
    String sector,
    String description
) {}
