package com.finanalysis.repository;

import com.finanalysis.model.FinancialStatement;
import com.finanalysis.model.StatementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FinancialStatementRepository extends JpaRepository<FinancialStatement, Long> {
    List<FinancialStatement> findByCompanyId(Long companyId);
    List<FinancialStatement> findByCompanyIdAndPeriod(Long companyId, String period);
    Optional<FinancialStatement> findByCompanyIdAndPeriodAndType(Long companyId, String period, StatementType type);

    @Query("SELECT DISTINCT fs.period FROM FinancialStatement fs WHERE fs.company.id = :companyId ORDER BY fs.period DESC")
    List<String> findDistinctPeriodsByCompanyId(@Param("companyId") Long companyId);
}
