package com.finanalysis.repository;

import com.finanalysis.model.FinancialLineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FinancialLineItemRepository extends JpaRepository<FinancialLineItem, Long> {
    List<FinancialLineItem> findByStatementIdOrderBySortOrderAsc(Long statementId);
    Optional<FinancialLineItem> findByStatementIdAndCode(Long statementId, String code);
}
