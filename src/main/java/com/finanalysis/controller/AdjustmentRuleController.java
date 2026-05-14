package com.finanalysis.controller;

import com.finanalysis.dto.AdjustmentRuleDto;
import com.finanalysis.service.AdjustmentRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/adjustment-rules")
@RequiredArgsConstructor
public class AdjustmentRuleController {

    private final AdjustmentRuleService adjustmentRuleService;

    @GetMapping
    public List<AdjustmentRuleDto> findAll(@RequestParam(required = false) Boolean activeOnly) {
        return Boolean.TRUE.equals(activeOnly)
                ? adjustmentRuleService.findActive()
                : adjustmentRuleService.findAll();
    }

    @GetMapping("/{id}")
    public AdjustmentRuleDto findById(@PathVariable Long id) {
        return adjustmentRuleService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdjustmentRuleDto create(@Valid @RequestBody AdjustmentRuleDto dto) {
        return adjustmentRuleService.create(dto);
    }

    @PutMapping("/{id}")
    public AdjustmentRuleDto update(@PathVariable Long id, @Valid @RequestBody AdjustmentRuleDto dto) {
        return adjustmentRuleService.update(id, dto);
    }

    @PatchMapping("/{id}/toggle")
    public AdjustmentRuleDto toggleActive(@PathVariable Long id) {
        return adjustmentRuleService.toggleActive(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        adjustmentRuleService.delete(id);
    }
}
