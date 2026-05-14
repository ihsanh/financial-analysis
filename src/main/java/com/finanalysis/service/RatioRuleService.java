package com.finanalysis.service;

import com.finanalysis.dto.RatioRuleDto;
import com.finanalysis.dto.RatioVariableDto;
import com.finanalysis.model.RatioRule;
import com.finanalysis.model.RatioVariable;
import com.finanalysis.repository.RatioRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RatioRuleService {

    private final RatioRuleRepository ratioRuleRepository;

    public List<RatioRuleDto> findAll() {
        return ratioRuleRepository.findAll().stream().map(this::toDto).toList();
    }

    public List<RatioRuleDto> findActive() {
        return ratioRuleRepository.findByIsActiveTrue().stream().map(this::toDto).toList();
    }

    public RatioRuleDto findById(Long id) {
        return ratioRuleRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Ratio rule not found: " + id));
    }

    @Transactional
    public RatioRuleDto create(RatioRuleDto dto) {
        RatioRule rule = buildFromDto(null, dto);
        return toDto(ratioRuleRepository.save(rule));
    }

    @Transactional
    public RatioRuleDto update(Long id, RatioRuleDto dto) {
        ratioRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ratio rule not found: " + id));
        RatioRule rule = buildFromDto(id, dto);
        return toDto(ratioRuleRepository.save(rule));
    }

    @Transactional
    public void delete(Long id) {
        ratioRuleRepository.deleteById(id);
    }

    @Transactional
    public RatioRuleDto toggleActive(Long id) {
        RatioRule rule = ratioRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ratio rule not found: " + id));
        rule.setIsActive(!Boolean.TRUE.equals(rule.getIsActive()));
        return toDto(ratioRuleRepository.save(rule));
    }

    private RatioRule buildFromDto(Long id, RatioRuleDto dto) {
        RatioRule rule = RatioRule.builder()
                .name(dto.name())
                .description(dto.description())
                .formula(dto.formula())
                .category(dto.category())
                .isDefault(Boolean.TRUE.equals(dto.isDefault()))
                .isActive(dto.isActive() == null || dto.isActive())
                .build();
        if (id != null) rule.setId(id);
        if (dto.variables() != null) {
            dto.variables().forEach(vDto -> {
                RatioVariable v = RatioVariable.builder()
                        .ratioRule(rule)
                        .variableName(vDto.variableName())
                        .statementType(vDto.statementType())
                        .lineItemCode(vDto.lineItemCode())
                        .aggregation(vDto.aggregation())
                        .build();
                rule.getVariables().add(v);
            });
        }
        return rule;
    }

    public RatioRuleDto toDto(RatioRule r) {
        List<RatioVariableDto> vars = r.getVariables().stream()
                .map(v -> new RatioVariableDto(v.getId(), v.getVariableName(),
                        v.getStatementType(), v.getLineItemCode(), v.getAggregation()))
                .toList();
        return new RatioRuleDto(r.getId(), r.getName(), r.getDescription(),
                r.getFormula(), r.getCategory(), r.getIsDefault(), r.getIsActive(), vars);
    }
}
