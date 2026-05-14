package com.finanalysis.repository;

import com.finanalysis.model.RatioRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RatioRuleRepository extends JpaRepository<RatioRule, Long> {
    List<RatioRule> findByIsActiveTrue();
    List<RatioRule> findByIsDefaultTrue();
    List<RatioRule> findByCategory(String category);
    boolean existsByNameAndIsDefaultTrue(String name);
}
