package com.finanalysis.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "financial_line_items",
       indexes = {
           @Index(name = "idx_line_item_statement", columnList = "statement_id"),
           @Index(name = "idx_line_item_code", columnList = "code")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FinancialLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "statement_id", nullable = false)
    private FinancialStatement statement;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    // Primary value (for BS and IS)
    @Column(name = "item_value", precision = 20, scale = 2)
    private BigDecimal value;

    // Trial balance specific
    @Column(name = "debit_value", precision = 20, scale = 2)
    private BigDecimal debitValue;

    @Column(name = "credit_value", precision = 20, scale = 2)
    private BigDecimal creditValue;

    // Hierarchy
    @Column(name = "item_level")
    private Integer level;

    @Column(name = "parent_code")
    private String parentCode;

    @Column(name = "sort_order")
    private Integer sortOrder;
}
