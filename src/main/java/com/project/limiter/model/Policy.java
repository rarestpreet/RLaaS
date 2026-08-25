package com.project.limiter.model;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.model.enums.AlgorithmType;
import com.project.limiter.model.enums.FailMode;
import com.project.limiter.model.enums.PolicyStatus;
import com.project.limiter.model.strategy.KeyStrategyConfig;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
    name = "rate_limit_policies",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_rate_limit_policies_project_id_name", columnNames = {"project_id", "name"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Policy extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "endpoint", nullable = false, length = 500)
    private String endpoint;

    @Enumerated(EnumType.STRING)
    @Column(name = "algorithm_type", nullable = false, length = 40)
    private AlgorithmType algorithmType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "algorithm_config", columnDefinition = "jsonb", nullable = false)
    private AlgorithmConfig algorithmConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_strategy", columnDefinition = "jsonb", nullable = false)
    private KeyStrategyConfig keyStrategy;

    @Enumerated(EnumType.STRING)
    @Column(name = "fail_mode", nullable = false, length = 20)
    private FailMode failMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PolicyStatus status;
}
