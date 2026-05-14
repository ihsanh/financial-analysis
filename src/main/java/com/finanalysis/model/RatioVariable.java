package com.finanalysis.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ratio_variables")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RatioVariable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ratio_rule_id", nullable = false)
    private RatioRule ratioRule;

    @Column(name = "variable_name", nullable = false)
    private String variableName;

    @Enumerated(EnumType.STRING)
    @Column(name = "statement_type", nullable = false)
    private StatementType statementType;

    @Column(name = "line_item_code", nullable = false)
    private String lineItemCode;

    /**
     * Optional aggregation: SUM (default), DEBIT, CREDIT
     */
    @Column(name = "aggregation")
    private String aggregation;
}
