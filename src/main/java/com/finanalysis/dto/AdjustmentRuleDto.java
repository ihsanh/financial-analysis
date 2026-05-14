package com.finanalysis.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record AdjustmentRuleDto(
    Long id,
    @NotBlank String name,
    String description,
    Boolean isActive,
    List<AdjustmentStepDto> steps
) {}
