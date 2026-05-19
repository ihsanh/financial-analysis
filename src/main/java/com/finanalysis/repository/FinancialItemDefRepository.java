package com.finanalysis.repository;

import com.finanalysis.model.FinancialItemDef;
import com.finanalysis.model.StatementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

public interface FinancialItemDefRepository extends JpaRepository<FinancialItemDef, Long> {
    Optional<FinancialItemDef> findByNameIgnoreCase(String name);
    Optional<FinancialItemDef> findByCode(String code);
    List<FinancialItemDef> findByStatementType(StatementType statementType, Sort sort);
    @Override
    @NonNull List<FinancialItemDef> findAll(@NonNull Sort sort);
}
