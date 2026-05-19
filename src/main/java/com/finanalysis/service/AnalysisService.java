package com.finanalysis.service;

import com.finanalysis.dto.*;
import com.finanalysis.model.*;
import com.finanalysis.repository.AdjustmentRuleRepository;
import com.finanalysis.repository.CompanyRepository;
import com.finanalysis.repository.FinancialItemDefRepository;
import com.finanalysis.repository.FinancialStatementRepository;
import com.finanalysis.repository.RatioRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalysisService {

    private final CompanyRepository companyRepository;
    private final FinancialStatementRepository statementRepository;
    private final RatioRuleRepository ratioRuleRepository;
    private final AdjustmentRuleRepository adjustmentRuleRepository;
    private final FinancialItemDefRepository itemDefRepository;
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

        List<RatioResultDto> ratioResults = calculateRatios(request.ratioRuleIds(), allValues);
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
                String code = (item.getCode() != null && !item.getCode().isBlank())
                        ? item.getCode()
                        : itemDefRepository.findByNameIgnoreCase(item.getName() != null ? item.getName().trim() : "")
                                .map(def -> def.getCode())
                                .orElse(item.getName());
                if (code != null) {
                    codeMap.put(code, value);
                }
            }
            result.put(s.getType(), codeMap);
        }
        return result;
    }

    private static final Pattern CODE_PATTERN = Pattern.compile("\\{([^}]+)}");

    private List<RatioResultDto> calculateRatios(List<Long> ruleIds,
                                                  Map<String, BigDecimal> allValues) {
        if (ruleIds == null || ruleIds.isEmpty()) return List.of();

        List<RatioRule> rules = ratioRuleRepository.findAllById(ruleIds);
        List<RatioResultDto> results = new ArrayList<>();

        for (RatioRule rule : rules) {
            Map<String, BigDecimal> resolved = resolveFormulaValues(rule.getFormula(), allValues);
            try {
                BigDecimal value = evaluateRatioFormula(rule.getFormula(), allValues);
                results.add(new RatioResultDto(rule.getId(), rule.getName(),
                        rule.getCategory(), rule.getFormula(), value, null, resolved));
            } catch (Exception e) {
                results.add(new RatioResultDto(rule.getId(), rule.getName(),
                        rule.getCategory(), rule.getFormula(), null, e.getMessage(), resolved));
            }
        }
        return results;
    }

    /** Extracts every {CODE} in the formula and maps it to its value (null = not found). */
    private Map<String, BigDecimal> resolveFormulaValues(String formula, Map<String, BigDecimal> allValues) {
        Map<String, BigDecimal> resolved = new LinkedHashMap<>();
        Matcher m = CODE_PATTERN.matcher(formula);
        while (m.find()) {
            String code = m.group(1);
            resolved.put(code, allValues.get(code));
        }
        return resolved;
    }

    private BigDecimal evaluateRatioFormula(String formula, Map<String, BigDecimal> values) {
        String resolved = formula;
        for (Map.Entry<String, BigDecimal> entry : values.entrySet()) {
            BigDecimal val = entry.getValue() != null ? entry.getValue() : BigDecimal.ZERO;
            resolved = resolved.replace("{" + entry.getKey() + "}", val.toPlainString());
        }
        if (resolved.contains("{")) {
            Matcher m = CODE_PATTERN.matcher(resolved);
            List<String> missing = new ArrayList<>();
            while (m.find()) missing.add(m.group(1));
            throw new IllegalArgumentException("Kalem bulunamadı: " + String.join(", ", missing));
        }
        Double result = spelParser.parseExpression(resolved).getValue(Double.class);
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
