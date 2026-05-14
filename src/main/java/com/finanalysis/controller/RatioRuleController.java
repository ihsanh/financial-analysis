package com.finanalysis.controller;

import com.finanalysis.dto.RatioRuleDto;
import com.finanalysis.service.RatioRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratio-rules")
@RequiredArgsConstructor
public class RatioRuleController {

    private final RatioRuleService ratioRuleService;

    @GetMapping
    public List<RatioRuleDto> findAll(@RequestParam(required = false) Boolean activeOnly) {
        return Boolean.TRUE.equals(activeOnly) ? ratioRuleService.findActive() : ratioRuleService.findAll();
    }

    @GetMapping("/{id}")
    public RatioRuleDto findById(@PathVariable Long id) {
        return ratioRuleService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RatioRuleDto create(@Valid @RequestBody RatioRuleDto dto) {
        return ratioRuleService.create(dto);
    }

    @PutMapping("/{id}")
    public RatioRuleDto update(@PathVariable Long id, @Valid @RequestBody RatioRuleDto dto) {
        return ratioRuleService.update(id, dto);
    }

    @PatchMapping("/{id}/toggle")
    public RatioRuleDto toggleActive(@PathVariable Long id) {
        return ratioRuleService.toggleActive(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        ratioRuleService.delete(id);
    }
}
