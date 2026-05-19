package com.finanalysis.service;

import com.finanalysis.dto.FinancialItemDefDto;
import com.finanalysis.model.FinancialItemDef;
import com.finanalysis.model.StatementType;
import com.finanalysis.repository.FinancialItemDefRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinancialItemDefService {

    private final FinancialItemDefRepository repository;

    @Transactional
    public FinancialItemDef findOrCreate(String name, String excelCode, StatementType statementType) {
        String trimmedName = name.trim();
        return repository.findByNameIgnoreCase(trimmedName).orElseGet(() -> {
            String code;
            if (excelCode != null && !excelCode.isBlank()) {
                code = repository.findByCode(excelCode.trim()).isPresent()
                        ? generateCode()
                        : excelCode.trim();
            } else {
                code = generateCode();
            }
            FinancialItemDef def = FinancialItemDef.builder()
                    .code(code)
                    .name(trimmedName)
                    .statementType(statementType)
                    .build();
            return repository.save(def);
        });
    }

    public List<FinancialItemDefDto> findAll(StatementType type) {
        Sort sort = Sort.by("code");
        List<FinancialItemDef> items = (type != null)
                ? repository.findByStatementType(type, sort)
                : repository.findAll(sort);
        return items.stream()
                .map(d -> new FinancialItemDefDto(d.getId(), d.getCode(), d.getName(), d.getStatementType()))
                .toList();
    }

    private String generateCode() {
        long count = repository.count();
        return String.format("FI%04d", count + 1);
    }
}
