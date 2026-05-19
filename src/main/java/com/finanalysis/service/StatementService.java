package com.finanalysis.service;

import com.finanalysis.dto.FinancialLineItemDto;
import com.finanalysis.dto.FinancialStatementDto;
import com.finanalysis.model.FinancialLineItem;
import com.finanalysis.model.FinancialStatement;
import com.finanalysis.model.StatementType;
import com.finanalysis.parser.ExcelStatementParser;
import com.finanalysis.parser.ExcelStatementParser.ParsedPeriod;
import com.finanalysis.repository.CompanyRepository;
import com.finanalysis.repository.FinancialStatementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatementService {

    private final FinancialStatementRepository statementRepository;
    private final CompanyRepository companyRepository;
    private final ExcelStatementParser excelParser;
    private final FinancialItemDefService itemDefService;

    public List<FinancialStatementDto> findByCompany(Long companyId) {
        return statementRepository.findByCompanyId(companyId)
                .stream().map(s -> toDto(s, false)).toList();
    }

    public FinancialStatementDto findById(Long id) {
        FinancialStatement s = statementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Statement not found: " + id));
        return toDto(s, true);
    }

    public List<String> findPeriodsByCompany(Long companyId) {
        return statementRepository.findDistinctPeriodsByCompanyId(companyId);
    }

    @Transactional
    public FinancialStatementDto upload(Long companyId, String period, StatementType type, MultipartFile file) {
        var company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));

        // Replace existing statement for same company+period+type
        statementRepository.findByCompanyIdAndPeriodAndType(companyId, period, type)
                .ifPresent(statementRepository::delete);

        FinancialStatement statement = FinancialStatement.builder()
                .company(company)
                .type(type)
                .period(period)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .build();

        try {
            List<FinancialLineItem> items = excelParser.parse(file.getInputStream(), type, statement);
            statement.getLineItems().addAll(items);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse file: " + e.getMessage(), e);
        }

        return toDto(statementRepository.save(statement), true);
    }

    /** Reads all period columns from the Excel and creates/updates one statement per period. */
    @Transactional
    public List<FinancialStatementDto> uploadMulti(Long companyId, StatementType type, MultipartFile file) {
        var company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));

        List<ParsedPeriod> periods;
        try {
            periods = excelParser.parseMultiPeriod(file.getInputStream(), type);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse file: " + e.getMessage(), e);
        }
        if (periods.isEmpty()) throw new IllegalArgumentException("Excel'de dönem sütunu bulunamadı (YYYY/M formatında başlık gerekli)");

        return periods.stream().map(parsed -> {
            // Replace existing statement for same company+period+type
            statementRepository.findByCompanyIdAndPeriodAndType(companyId, parsed.period(), type)
                    .ifPresent(statementRepository::delete);

            FinancialStatement statement = FinancialStatement.builder()
                    .company(company)
                    .type(type)
                    .period(parsed.period())
                    .fileName(file.getOriginalFilename())
                    .fileType(file.getContentType())
                    .build();

            List<FinancialLineItem> items = parsed.items().stream()
                    .map(raw -> {
                        // Register item in dictionary; assign system code if raw has none
                        var def = itemDefService.findOrCreate(raw.name(), raw.code(), type);
                        var entity = excelParser.toEntity(raw, statement);
                        if (entity.getCode() == null || entity.getCode().isBlank()) {
                            entity.setCode(def.getCode());
                        }
                        return entity;
                    })
                    .toList();
            statement.getLineItems().addAll(items);
            return toDto(statementRepository.save(statement), false);
        }).toList();
    }

    @Transactional
    public void delete(Long id) {
        statementRepository.deleteById(id);
    }

    public FinancialStatementDto toDto(FinancialStatement s, boolean includeItems) {
        List<FinancialLineItemDto> items = includeItems
                ? s.getLineItems().stream().map(this::toItemDto).toList()
                : List.of();
        return new FinancialStatementDto(
                s.getId(), s.getCompany().getId(), s.getCompany().getName(),
                s.getType(), s.getPeriod(), s.getFileName(), s.getUploadedAt(), items);
    }

    public FinancialLineItemDto toItemDto(FinancialLineItem i) {
        return new FinancialLineItemDto(i.getId(), i.getCode(), i.getName(),
                i.getValue(), i.getDebitValue(), i.getCreditValue(),
                i.getLevel(), i.getParentCode(), i.getSortOrder());
    }
}
