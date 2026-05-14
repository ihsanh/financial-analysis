package com.finanalysis.parser;

import com.finanalysis.model.FinancialLineItem;
import com.finanalysis.model.FinancialStatement;
import com.finanalysis.model.StatementType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses Excel (.xlsx) financial statements using a fixed column template.
 *
 * Balance Sheet / Income Statement template:
 *   Col A = code, Col B = name, Col C = value
 *
 * Trial Balance template:
 *   Col A = code, Col B = name, Col C = debit, Col D = credit
 *
 * Row 0 is treated as a header row and skipped.
 * Rows where code is blank are skipped.
 */
@Component
public class ExcelStatementParser {

    public List<FinancialLineItem> parse(InputStream inputStream,
                                         StatementType type,
                                         FinancialStatement statement) throws IOException {
        List<FinancialLineItem> items = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            int sortOrder = 0;
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String code = cellToString(row.getCell(0));
                if (code == null || code.isBlank()) continue;
                String name = cellToString(row.getCell(1));
                if (name == null) name = "";

                FinancialLineItem item = FinancialLineItem.builder()
                        .statement(statement)
                        .code(code.trim())
                        .name(name.trim())
                        .sortOrder(sortOrder++)
                        .build();

                if (type == StatementType.TRIAL_BALANCE) {
                    item.setDebitValue(cellToBigDecimal(row.getCell(2)));
                    item.setCreditValue(cellToBigDecimal(row.getCell(3)));
                    BigDecimal debit = item.getDebitValue() != null ? item.getDebitValue() : BigDecimal.ZERO;
                    BigDecimal credit = item.getCreditValue() != null ? item.getCreditValue() : BigDecimal.ZERO;
                    item.setValue(debit.subtract(credit));
                } else {
                    item.setValue(cellToBigDecimal(row.getCell(2)));
                }

                // Derive hierarchy level from leading spaces in name or from code length
                item.setLevel(deriveLevel(code));
                items.add(item);
            }
        }
        return items;
    }

    private String cellToString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d)) yield String.valueOf((long) d);
                yield String.valueOf(d);
            }
            case FORMULA -> {
                try { yield String.valueOf(cell.getNumericCellValue()); }
                catch (Exception e) { yield cell.getStringCellValue(); }
            }
            default -> null;
        };
    }

    private BigDecimal cellToBigDecimal(Cell cell) {
        if (cell == null) return null;
        try {
            return switch (cell.getCellType()) {
                case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue());
                case STRING -> {
                    String s = cell.getStringCellValue().trim().replace(",", ".");
                    if (s.isBlank()) yield null;
                    yield new BigDecimal(s);
                }
                case FORMULA -> BigDecimal.valueOf(cell.getNumericCellValue());
                default -> null;
            };
        } catch (Exception e) {
            return null;
        }
    }

    private int deriveLevel(String code) {
        if (code == null) return 0;
        return switch (code.trim().length()) {
            case 1 -> 0;
            case 2 -> 1;
            case 3 -> 2;
            default -> 3;
        };
    }
}
