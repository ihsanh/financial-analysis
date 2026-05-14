package com.finanalysis.service;

import com.finanalysis.model.*;
import com.finanalysis.repository.RatioRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the most commonly used financial ratios when none exist in the database.
 * These are standard ratios used in Turkish credit analysis (BDDK / banking sector norms).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DefaultDataInitializer implements CommandLineRunner {

    private final RatioRuleRepository ratioRuleRepository;

    @Override
    public void run(String... args) {
        if (!ratioRuleRepository.findByIsDefaultTrue().isEmpty()) return;
        log.info("Seeding default ratio rules...");
        ratioRuleRepository.saveAll(buildDefaultRules());
        log.info("Default ratio rules created.");
    }

    private List<RatioRule> buildDefaultRules() {
        return List.of(
            // --- Liquidity ---
            ratio("Current Ratio", "Cari Oran: Dönen Varlıklar / Kısa Vadeli Yükümlülükler",
                    "{currentAssets} / {currentLiabilities}", "LIQUIDITY",
                    var("currentAssets", StatementType.BALANCE_SHEET, "1"),
                    var("currentLiabilities", StatementType.BALANCE_SHEET, "3")),

            ratio("Quick Ratio", "Asit-Test Oranı: (Dönen Varlıklar - Stoklar) / Kısa Vadeli Yükümlülükler",
                    "({currentAssets} - {inventories}) / {currentLiabilities}", "LIQUIDITY",
                    var("currentAssets", StatementType.BALANCE_SHEET, "1"),
                    var("inventories", StatementType.BALANCE_SHEET, "15"),
                    var("currentLiabilities", StatementType.BALANCE_SHEET, "3")),

            ratio("Cash Ratio", "Nakit Oran: Nakit ve Nakit Benzerleri / Kısa Vadeli Yükümlülükler",
                    "{cash} / {currentLiabilities}", "LIQUIDITY",
                    var("cash", StatementType.BALANCE_SHEET, "10"),
                    var("currentLiabilities", StatementType.BALANCE_SHEET, "3")),

            // --- Leverage ---
            ratio("Debt Ratio", "Borç Oranı: Toplam Borç / Toplam Varlıklar",
                    "{totalLiabilities} / {totalAssets}", "LEVERAGE",
                    var("totalLiabilities", StatementType.BALANCE_SHEET, "5"),
                    var("totalAssets", StatementType.BALANCE_SHEET, "A")),

            ratio("Debt to Equity", "Borç/Özsermaye: Toplam Borç / Özsermaye",
                    "{totalLiabilities} / {equity}", "LEVERAGE",
                    var("totalLiabilities", StatementType.BALANCE_SHEET, "5"),
                    var("equity", StatementType.BALANCE_SHEET, "6")),

            ratio("Equity Ratio", "Özsermaye Oranı: Özsermaye / Toplam Varlıklar",
                    "{equity} / {totalAssets}", "LEVERAGE",
                    var("equity", StatementType.BALANCE_SHEET, "6"),
                    var("totalAssets", StatementType.BALANCE_SHEET, "A")),

            ratio("Interest Coverage", "Faiz Karşılama: FVÖK / Finansman Giderleri",
                    "{ebit} / {interestExpense}", "LEVERAGE",
                    var("ebit", StatementType.INCOME_STATEMENT, "60"),
                    var("interestExpense", StatementType.INCOME_STATEMENT, "66")),

            // --- Profitability ---
            ratio("Gross Profit Margin", "Brüt Kar Marjı: Brüt Kar / Net Satışlar",
                    "{grossProfit} / {netRevenue}", "PROFITABILITY",
                    var("grossProfit", StatementType.INCOME_STATEMENT, "62"),
                    var("netRevenue", StatementType.INCOME_STATEMENT, "60")),

            ratio("Operating Profit Margin", "Faaliyet Kar Marjı: Faaliyet Karı / Net Satışlar",
                    "{operatingProfit} / {netRevenue}", "PROFITABILITY",
                    var("operatingProfit", StatementType.INCOME_STATEMENT, "63"),
                    var("netRevenue", StatementType.INCOME_STATEMENT, "60")),

            ratio("Net Profit Margin", "Net Kar Marjı: Net Kar / Net Satışlar",
                    "{netProfit} / {netRevenue}", "PROFITABILITY",
                    var("netProfit", StatementType.INCOME_STATEMENT, "69"),
                    var("netRevenue", StatementType.INCOME_STATEMENT, "60")),

            ratio("Return on Assets (ROA)", "Aktif Karlılığı: Net Kar / Toplam Varlıklar",
                    "{netProfit} / {totalAssets}", "PROFITABILITY",
                    var("netProfit", StatementType.INCOME_STATEMENT, "69"),
                    var("totalAssets", StatementType.BALANCE_SHEET, "A")),

            ratio("Return on Equity (ROE)", "Özsermaye Karlılığı: Net Kar / Özsermaye",
                    "{netProfit} / {equity}", "PROFITABILITY",
                    var("netProfit", StatementType.INCOME_STATEMENT, "69"),
                    var("equity", StatementType.BALANCE_SHEET, "6")),

            // --- Activity ---
            ratio("Asset Turnover", "Aktif Devir Hızı: Net Satışlar / Toplam Varlıklar",
                    "{netRevenue} / {totalAssets}", "ACTIVITY",
                    var("netRevenue", StatementType.INCOME_STATEMENT, "60"),
                    var("totalAssets", StatementType.BALANCE_SHEET, "A")),

            ratio("Receivables Turnover", "Alacak Devir Hızı: Net Satışlar / Ticari Alacaklar",
                    "{netRevenue} / {tradeReceivables}", "ACTIVITY",
                    var("netRevenue", StatementType.INCOME_STATEMENT, "60"),
                    var("tradeReceivables", StatementType.BALANCE_SHEET, "12")),

            ratio("Inventory Turnover", "Stok Devir Hızı: Satılan Malın Maliyeti / Ortalama Stoklar",
                    "{cogs} / {inventories}", "ACTIVITY",
                    var("cogs", StatementType.INCOME_STATEMENT, "62"),
                    var("inventories", StatementType.BALANCE_SHEET, "15"))
        );
    }

    private RatioRule ratio(String name, String description, String formula, String category,
                             RatioVariable... variables) {
        RatioRule rule = RatioRule.builder()
                .name(name)
                .description(description)
                .formula(formula)
                .category(category)
                .isDefault(true)
                .isActive(true)
                .build();
        for (RatioVariable v : variables) {
            v.setRatioRule(rule);
            rule.getVariables().add(v);
        }
        return rule;
    }

    private RatioVariable var(String variableName, StatementType type, String code) {
        return RatioVariable.builder()
                .variableName(variableName)
                .statementType(type)
                .lineItemCode(code)
                .aggregation("SUM")
                .build();
    }
}
