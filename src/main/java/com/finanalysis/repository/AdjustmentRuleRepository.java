package com.finanalysis.repository;

import com.finanalysis.model.AdjustmentRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AdjustmentRuleRepository extends JpaRepository<AdjustmentRule, Long> {
    List<AdjustmentRule> findByIsActiveTrue();
}
