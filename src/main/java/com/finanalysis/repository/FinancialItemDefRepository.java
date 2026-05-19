package com.finanalysis.repository;

import com.finanalysis.model.FinancialItemDef;
import com.finanalysis.model.StatementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Sort;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

public interface FinancialItemDefRepository extends JpaRepository<FinancialItemDef, Long> {
    Optional<FinancialItemDef> findByNameIgnoreCase(String name);
    Optional<FinancialItemDef> findByCode(String code);
    List<FinancialItemDef> findByStatementType(StatementType statementType, Sort sort);

    @Query("SELECT MAX(d.code) FROM FinancialItemDef d WHERE d.code LIKE 'FI%'")
    Optional<String> findMaxCode();

    @Modifying
    @Query("DELETE FROM FinancialItemDef d WHERE d.code NOT IN " +
           "(SELECT DISTINCT i.code FROM FinancialLineItem i WHERE i.code IS NOT NULL AND i.code <> '')")
    int deleteOrphans();

    @Override
    @NonNull List<FinancialItemDef> findAll(@NonNull Sort sort);
}
