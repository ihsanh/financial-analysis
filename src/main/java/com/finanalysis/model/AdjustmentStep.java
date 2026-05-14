package com.finanalysis.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "adjustment_steps")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdjustmentStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adjustment_rule_id", nullable = false)
    private AdjustmentRule adjustmentRule;

    @Column(name = "output_code", nullable = false)
    private String outputCode;

    @Column(name = "output_name", nullable = false)
    private String outputName;

    @Column(nullable = false, length = 2000)
    private String formula;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_statement_type")
    private StatementType sourceStatementType;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    private String description;
}
