package com.finanalysis.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record RatioRuleDto(
    Long id,
    @NotBlank String name,
    String description,
    @NotBlank String formula,
    String category,
    Boolean isDefault,
    Boolean isActive,
    List<RatioVariableDto> variables
) {}
