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
import java.util.*;
import java.util.regex.Pattern;

/**
 * Parses Excel (.xlsx) financial statements.
 *
 * Multi-period format (row 0 = headers):
 *   Col A = code, Col B = name
 *   Col C+ = period columns, header must match YYYY/M or YYYY/MM  (e.g. "2026/3", "2025/12")
 *   Trial Balance: period columns come in pairs — "YYYY/M Borç" (debit) then "YYYY/M Alacak" (credit)
 *
 * Single-period legacy format: same but only one value column.
 */
@Component
public class ExcelStatementParser {

    private static final Pattern PERIOD_EXACT  = Pattern.compile("^(\\d{4}/\\d{1,2})$");
    private static final Pattern PERIOD_DEBIT  = Pattern.compile("^(\\d{4}/\\d{1,2})\\s*(Borç|Borc|D|Debit)$",  Pattern.CASE_INSENSITIVE);
    private static final Pattern PERIOD_CREDIT = Pattern.compile("^(\\d{4}/\\d{1,2})\\s*(Alacak|A|Credit)$", Pattern.CASE_INSENSITIVE);

    public record RawItem(String code, String name,
                          BigDecimal value, BigDecimal debitValue, BigDecimal creditValue,
                          int level, int sortOrder) {}

    public record ParsedPeriod(String period, List<RawItem> items) {}

    /** Reads all period columns from the Excel header row and returns one ParsedPeriod per column. */
    public List<ParsedPeriod> parseMultiPeriod(InputStream inputStream, StatementType type) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            Row header = sheet.getRow(0);
            if (header == null) return List.of();

            if (type == StatementType.TRIAL_BALANCE) {
                return parseTrialBalance(sheet, header);
            } else {
                return parseValueStatement(sheet, header);
            }
        }
    }

    private List<ParsedPeriod> parseValueStatement(Sheet sheet, Row header) {
        // Collect period-column index in encounter order
        // Scan all columns for period headers; first match tells us layout
        LinkedHashMap<Integer, String> periodCols = new LinkedHashMap<>();
        for (int c = 0; c <= header.getLastCellNum(); c++) {
            String h = cellToString(header.getCell(c));
            if (h != null && PERIOD_EXACT.matcher(h.trim()).matches()) {
                periodCols.put(c, h.trim());
            }
        }
        if (periodCols.isEmpty()) return List.of();

        int firstPeriodCol = periodCols.keySet().iterator().next();
        // firstPeriodCol==1 → only name column before periods (no code)
        // firstPeriodCol>=2 → code (col0) + name (col1) before periods
        boolean hasCode = firstPeriodCol >= 2;
        int nameCol = hasCode ? 1 : 0;

        // Pass 1: collect rows to determine indent unit
        record DataRow(int rowIdx, String code, String rawName, Map<Integer, BigDecimal> vals) {}
        List<DataRow> dataRows = new ArrayList<>();
        for (int r = 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            String rawName = cellToString(row.getCell(nameCol));
            if (rawName == null || rawName.isBlank()) continue;
            String code = hasCode ? nullToEmpty(cellToString(row.getCell(0))) : "";
            Map<Integer, BigDecimal> vals = new LinkedHashMap<>();
            for (int c : periodCols.keySet()) vals.put(c, cellToBigDecimal(row.getCell(c)));
            dataRows.add(new DataRow(r, code, rawName, vals));
        }
        int indentUnit = detectIndentUnit(dataRows.stream().map(DataRow::rawName).toList());

        // Pass 2: build items with normalized levels
        Map<String, List<RawItem>> periodItems = new LinkedHashMap<>();
        for (String p : periodCols.values()) periodItems.put(p, new ArrayList<>());

        int sortOrder = 0;
        for (DataRow dr : dataRows) {
            int level = countLeadingSpaces(dr.rawName()) / indentUnit;
            String name = dr.rawName().trim();
            String code = dr.code().trim();
            int colIdx = 0;
            for (Map.Entry<Integer, String> e : periodCols.entrySet()) {
                periodItems.get(e.getValue()).add(
                        new RawItem(code, name, dr.vals().get(e.getKey()), null, null, level, sortOrder + colIdx));
                colIdx++;
            }
            sortOrder += periodCols.size();
        }

        return periodItems.entrySet().stream()
                .map(e -> new ParsedPeriod(e.getKey(), e.getValue()))
                .toList();
    }

    private List<ParsedPeriod> parseTrialBalance(Sheet sheet, Row header) {
        // Map: period → {debitCol, creditCol}
        record ColPair(int debitCol, int creditCol) {}
        LinkedHashMap<String, ColPair> pairs = new LinkedHashMap<>();
        Map<String, Integer> debitCols  = new LinkedHashMap<>();
        Map<String, Integer> creditCols = new LinkedHashMap<>();

        for (int c = 0; c <= header.getLastCellNum(); c++) {
            String h = cellToString(header.getCell(c));
            if (h == null) continue;
            var dm = PERIOD_DEBIT.matcher(h.trim());
            if (dm.matches()) { debitCols.put(dm.group(1), c); continue; }
            var cm = PERIOD_CREDIT.matcher(h.trim());
            if (cm.matches()) { creditCols.put(cm.group(1), c); continue; }
            if (PERIOD_EXACT.matcher(h.trim()).matches()) { debitCols.put(h.trim(), c); }
        }

        // Match debit+credit pairs; if no credit found, creditCol = -1
        for (Map.Entry<String, Integer> e : debitCols.entrySet()) {
            int creditCol = creditCols.getOrDefault(e.getKey(), -1);
            pairs.put(e.getKey(), new ColPair(e.getValue(), creditCol));
        }

        if (pairs.isEmpty()) return List.of();

        int firstPeriodCol = debitCols.values().stream().mapToInt(i -> i).min().orElse(2);
        boolean hasCode = firstPeriodCol >= 2;
        int nameCol = hasCode ? 1 : 0;

        // Pass 1: collect rows
        record TbRow(String code, String rawName, Map<String, BigDecimal[]> pairVals) {}
        List<TbRow> tbRows = new ArrayList<>();
        for (int r = 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            String rawName = cellToString(row.getCell(nameCol));
            if (rawName == null || rawName.isBlank()) continue;
            String code = hasCode ? nullToEmpty(cellToString(row.getCell(0))) : "";
            Map<String, BigDecimal[]> pv = new LinkedHashMap<>();
            for (Map.Entry<String, ColPair> e : pairs.entrySet()) {
                ColPair cp = e.getValue();
                BigDecimal debit  = cellToBigDecimal(row.getCell(cp.debitCol()));
                BigDecimal credit = cp.creditCol() >= 0 ? cellToBigDecimal(row.getCell(cp.creditCol())) : null;
                pv.put(e.getKey(), new BigDecimal[]{debit, credit});
            }
            tbRows.add(new TbRow(code, rawName, pv));
        }
        int indentUnit = detectIndentUnit(tbRows.stream().map(TbRow::rawName).toList());

        // Pass 2: build items with normalized levels
        Map<String, List<RawItem>> periodItems = new LinkedHashMap<>();
        for (String p : pairs.keySet()) periodItems.put(p, new ArrayList<>());

        int sortOrder = 0;
        for (TbRow tr : tbRows) {
            int level = countLeadingSpaces(tr.rawName()) / indentUnit;
            String name = tr.rawName().trim();
            String code = tr.code().trim();
            int idx = 0;
            for (Map.Entry<String, BigDecimal[]> e : tr.pairVals().entrySet()) {
                BigDecimal debit  = e.getValue()[0];
                BigDecimal credit = e.getValue()[1];
                BigDecimal d  = debit  != null ? debit  : BigDecimal.ZERO;
                BigDecimal c2 = credit != null ? credit : BigDecimal.ZERO;
                periodItems.get(e.getKey()).add(
                        new RawItem(code, name, d.subtract(c2), debit, credit, level, sortOrder + idx));
                idx++;
            }
            sortOrder += pairs.size();
        }

        return periodItems.entrySet().stream()
                .map(e -> new ParsedPeriod(e.getKey(), e.getValue()))
                .toList();
    }

    /** Legacy single-period parse — kept for backward compatibility. */
    public List<FinancialLineItem> parse(InputStream inputStream,
                                         StatementType type,
                                         FinancialStatement statement) throws IOException {
        List<ParsedPeriod> periods = parseMultiPeriod(inputStream, type);
        if (periods.isEmpty()) return List.of();
        // Use only the first period found (legacy callers provide their own statement)
        return periods.get(0).items().stream()
                .map(raw -> toEntity(raw, statement))
                .toList();
    }

    public FinancialLineItem toEntity(RawItem raw, FinancialStatement statement) {
        return FinancialLineItem.builder()
                .statement(statement)
                .code(raw.code())
                .name(raw.name())
                .value(raw.value())
                .debitValue(raw.debitValue())
                .creditValue(raw.creditValue())
                .level(raw.level())
                .sortOrder(raw.sortOrder())
                .build();
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

    private String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private int countLeadingSpaces(String s) {
        if (s == null) return 0;
        int count = 0;
        for (char c : s.toCharArray()) {
            if (c == ' ') count++;
            else if (c == '\t') count += 2;
            else break;
        }
        return count;
    }

    /** Finds the minimum non-zero indent count to use as the normalization unit. */
    private int detectIndentUnit(List<String> names) {
        int unit = names.stream()
                .mapToInt(this::countLeadingSpaces)
                .filter(i -> i > 0)
                .min()
                .orElse(1);
        return unit == 0 ? 1 : unit;
    }
}
