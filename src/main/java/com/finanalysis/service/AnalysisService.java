package com.finanalysis.service;

import com.finanalysis.dto.*;
import com.finanalysis.model.*;
import com.finanalysis.repository.AdjustmentRuleRepository;
import com.finanalysis.repository.CompanyRepository;
import com.finanalysis.repository.FinancialStatementRepository;
import com.finanalysis.repository.RatioRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalysisService {

    private final CompanyRepository companyRepository;
    private final FinancialStatementRepository statementRepository;
    private final RatioRuleRepository ratioRuleRepository;
    private final AdjustmentRuleRepository adjustmentRuleRepository;
    private final ExpressionParser spelParser = new SpelExpressionParser();

    public AnalysisResponseDto analyze(AnalysisRequestDto request) {
        Company company = companyRepository.findById(request.companyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + request.companyId()));

        List<FinancialStatement> statements =
                statementRepository.findByCompanyIdAndPeriod(request.companyId(), request.period());

        // Build line item maps per statement type: type -> (code -> value)
        Map<StatementType, Map<String, BigDecimal>> valuesByType = buildValueMaps(statements);

        // Also build a unified map across all types for adjustment formulas
        Map<String, BigDecimal> allValues = new HashMap<>();
        valuesByType.values().forEach(allValues::putAll);

        List<RatioResultDto> ratioResults = calculateRatios(request.ratioRuleIds(), valuesByType);
        List<AdjustmentResultDto> adjustmentResults = applyAdjustments(request.adjustmentRuleIds(), allValues);

        return new AnalysisResponseDto(
                company.getId(), company.getName(), request.period(),
                ratioResults, adjustmentResults);
    }

    private Map<StatementType, Map<String, BigDecimal>> buildValueMaps(List<FinancialStatement> statements) {
        Map<StatementType, Map<String, BigDecimal>> result = new EnumMap<>(StatementType.class);
        for (FinancialStatement s : statements) {
            Map<String, BigDecimal> codeMap = new HashMap<>();
            for (FinancialLineItem item : s.getLineItems()) {
                BigDecimal value = item.getValue() != null ? item.getValue() : BigDecimal.ZERO;
                codeMap.put(item.getCode(), value);
            }
            result.put(s.getType(), codeMap);
        }
        return result;
    }

    private List<RatioResultDto> calculateRatios(List<Long> ruleIds,
                                                  Map<StatementType, Map<String, BigDecimal>> valuesByType) {
        if (ruleIds == null || ruleIds.isEmpty()) return List.of();

        List<RatioRule> rules = ratioRuleRepository.findAllById(ruleIds);
        List<RatioResultDto> results = new ArrayList<>();

        for (RatioRule rule : rules) {
            try {
                BigDecimal value = evaluateRatioFormula(rule, valuesByType);
                results.add(new RatioResultDto(rule.getId(), rule.getName(),
                        rule.getCategory(), rule.getFormula(), value, null));
            } catch (Exception e) {
                results.add(new RatioResultDto(rule.getId(), rule.getName(),
                        rule.getCategory(), rule.getFormula(), null, e.getMessage()));
            }
        }
        return results;
    }

    private BigDecimal evaluateRatioFormula(RatioRule rule,
                                             Map<StatementType, Map<String, BigDecimal>> valuesByType) {
        StandardEvaluationContext context = new StandardEvaluationContext();

        for (RatioVariable var : rule.getVariables()) {
            Map<String, BigDecimal> codeMap = valuesByType.getOrDefault(var.getStatementType(), Map.of());
            BigDecimal varValue = codeMap.getOrDefault(var.getLineItemCode(), BigDecimal.ZERO);
            context.setVariable(var.getVariableName(), varValue.doubleValue());
        }

        // Convert {varName} -> #varName for SpEL
        String spelFormula = rule.getFormula().replaceAll("\\{([^}]+)}", "#$1");
        Double result = spelParser.parseExpression(spelFormula).getValue(context, Double.class);
        if (result == null) return null;
        return BigDecimal.valueOf(result).setScale(4, RoundingMode.HALF_UP);
    }

    private List<AdjustmentResultDto> applyAdjustments(List<Long> ruleIds,
                                                        Map<String, BigDecimal> allValues) {
        if (ruleIds == null || ruleIds.isEmpty()) return List.of();

        List<AdjustmentRule> rules = adjustmentRuleRepository.findAllById(ruleIds);
        List<AdjustmentResultDto> results = new ArrayList<>();

        for (AdjustmentRule rule : rules) {
            Map<String, BigDecimal> workingValues = new HashMap<>(allValues);
            List<FinancialLineItemDto> adjustedItems = new ArrayList<>();
            Map<String, String> errors = new LinkedHashMap<>();

            for (AdjustmentStep step : rule.getSteps()) {
                try {
                    BigDecimal stepValue = evaluateAdjustmentFormula(step.getFormula(), workingValues);
                    workingValues.put(step.getOutputCode(), stepValue);
                    adjustedItems.add(new FinancialLineItemDto(null, step.getOutputCode(),
                            step.getOutputName(), stepValue, null, null, null, null, step.getStepOrder()));
                } catch (Exception e) {
                    errors.put(step.getOutputCode(), e.getMessage());
                }
            }
            results.add(new AdjustmentResultDto(rule.getId(), rule.getName(), adjustedItems, errors));
        }
        return results;
    }

    private BigDecimal evaluateAdjustmentFormula(String formula, Map<String, BigDecimal> values) {
        // Replace {code} with actual numeric value for direct arithmetic evaluation
        String resolved = formula;
        for (Map.Entry<String, BigDecimal> entry : values.entrySet()) {
            BigDecimal val = entry.getValue() != null ? entry.getValue() : BigDecimal.ZERO;
            resolved = resolved.replace("{" + entry.getKey() + "}", val.toPlainString());
        }
        // Check for unresolved placeholders
        if (resolved.contains("{")) {
            String missing = resolved.replaceAll(".*\\{([^}]+)}.*", "$1");
            throw new IllegalArgumentException("Unresolved variable: " + missing);
        }
        Double result = spelParser.parseExpression(resolved).getValue(Double.class);
        if (result == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(result).setScale(2, RoundingMode.HALF_UP);
    }
}
