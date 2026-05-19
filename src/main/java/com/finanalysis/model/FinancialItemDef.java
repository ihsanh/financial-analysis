package com.finanalysis.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.finanalysis.model.StatementType;

@Entity
@Table(name = "financial_item_defs",
       indexes = { @Index(name = "idx_item_def_name", columnList = "name") })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FinancialItemDef {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 30)
    private String code;

    @Column(nullable = false, length = 500)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "statement_type", length = 30)
    private StatementType statementType;

    @Column(name = "level")
    private Integer level;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
