package com.finanalysis.repository;

import com.finanalysis.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByTaxNumber(String taxNumber);
    boolean existsByTaxNumber(String taxNumber);
}
