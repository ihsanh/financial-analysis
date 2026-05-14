package com.finanalysis.service;

import com.finanalysis.dto.AdjustmentRuleDto;
import com.finanalysis.dto.AdjustmentStepDto;
import com.finanalysis.model.AdjustmentRule;
import com.finanalysis.model.AdjustmentStep;
import com.finanalysis.repository.AdjustmentRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdjustmentRuleService {

    private final AdjustmentRuleRepository adjustmentRuleRepository;

    public List<AdjustmentRuleDto> findAll() {
        return adjustmentRuleRepository.findAll().stream().map(this::toDto).toList();
    }

    public List<AdjustmentRuleDto> findActive() {
        return adjustmentRuleRepository.findByIsActiveTrue().stream().map(this::toDto).toList();
    }

    public AdjustmentRuleDto findById(Long id) {
        return adjustmentRuleRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Adjustment rule not found: " + id));
    }

    @Transactional
    public AdjustmentRuleDto create(AdjustmentRuleDto dto) {
        AdjustmentRule rule = buildFromDto(null, dto);
        return toDto(adjustmentRuleRepository.save(rule));
    }

    @Transactional
    public AdjustmentRuleDto update(Long id, AdjustmentRuleDto dto) {
        adjustmentRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Adjustment rule not found: " + id));
        AdjustmentRule rule = buildFromDto(id, dto);
        return toDto(adjustmentRuleRepository.save(rule));
    }

    @Transactional
    public void delete(Long id) {
        adjustmentRuleRepository.deleteById(id);
    }

    @Transactional
    public AdjustmentRuleDto toggleActive(Long id) {
        AdjustmentRule rule = adjustmentRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Adjustment rule not found: " + id));
        rule.setIsActive(!Boolean.TRUE.equals(rule.getIsActive()));
        return toDto(adjustmentRuleRepository.save(rule));
    }

    private AdjustmentRule buildFromDto(Long id, AdjustmentRuleDto dto) {
        AdjustmentRule rule = AdjustmentRule.builder()
                .name(dto.name())
                .description(dto.description())
                .isActive(dto.isActive() == null || dto.isActive())
                .build();
        if (id != null) rule.setId(id);
        if (dto.steps() != null) {
            dto.steps().forEach(sDto -> {
                AdjustmentStep step = AdjustmentStep.builder()
                        .adjustmentRule(rule)
                        .outputCode(sDto.outputCode())
                        .outputName(sDto.outputName())
                        .formula(sDto.formula())
                        .sourceStatementType(sDto.sourceStatementType())
                        .stepOrder(sDto.stepOrder())
                        .description(sDto.description())
                        .build();
                rule.getSteps().add(step);
            });
        }
        return rule;
    }

    public AdjustmentRuleDto toDto(AdjustmentRule r) {
        List<AdjustmentStepDto> steps = r.getSteps().stream()
                .map(s -> new AdjustmentStepDto(s.getId(), s.getOutputCode(), s.getOutputName(),
                        s.getFormula(), s.getSourceStatementType(), s.getStepOrder(), s.getDescription()))
                .toList();
        return new AdjustmentRuleDto(r.getId(), r.getName(), r.getDescription(), r.getIsActive(), steps);
    }
}
