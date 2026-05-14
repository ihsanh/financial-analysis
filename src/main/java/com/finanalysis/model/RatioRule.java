package com.finanalysis.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ratio_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RatioRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    /**
     * Formula using {variableName} placeholders.
     * Example: "{currentAssets} / {currentLiabilities}"
     */
    @Column(nullable = false, length = 1000)
    private String formula;

    private String category;

    @Column(name = "is_default")
    private Boolean isDefault;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "ratioRule", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RatioVariable> variables = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isDefault == null) isDefault = false;
        if (isActive == null) isActive = true;
    }
}
