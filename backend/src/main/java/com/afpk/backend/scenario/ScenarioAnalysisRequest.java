package com.afpk.backend.scenario;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/** Accept the existing React payload, but never deserialize its calculated results. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ScenarioAnalysisRequest(
        @NotNull @Valid Conditions conditions,
        @NotNull @Valid Cashflow cashflow,
        @NotNull @Valid Goal goal,
        @Valid Adjustment adjustment,
        @Valid StressTest stressTest) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Conditions(
            @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 4)
            BigDecimal incomeDecreaseRate,
            @NotNull @DecimalMin("0") @DecimalMax("1000") @Digits(integer = 4, fraction = 4)
            BigDecimal expenseIncreaseRate) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Cashflow(
            @NotNull @Min(0) @Max(1_000_000_000_000L) Long originalIncome,
            @NotNull @Min(0) @Max(1_000_000_000_000L) Long originalExpenses,
            @NotNull @Min(0) @Max(1_000_000_000_000L) Long monthlyLoanPayment) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Goal(
            @NotNull @Min(1) @Max(1_000_000_000_000L) Long targetAmount,
            @NotNull @Min(1) @Max(600) Integer remainingMonths) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Adjustment(
            @NotNull @Min(1) @Max(1_000_000_000_000L) Long targetAmount,
            @NotNull @Min(1) @Max(600) Integer remainingMonths,
            @NotNull @Min(0) @Max(1_000_000_000_000L) Long monthlySavings) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RevisedPlan(
            @NotNull @Min(1) @Max(1_000_000_000_000L) Long targetAmount,
            @NotNull @Min(1) @Max(600) Integer remainingMonths,
            @NotNull @Min(0) @Max(1_000_000_000_000L) Long plannedMonthlySavings) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StressCondition(
            @NotBlank @Size(max = 80) String name,
            @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 4)
            BigDecimal incomeDecreaseRate,
            @NotNull @DecimalMin("0") @DecimalMax("1000") @Digits(integer = 4, fraction = 4)
            BigDecimal expenseIncreaseRate,
            @Min(0) @Max(1_000_000_000_000L) Long extraCost) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StressTest(
            @NotNull @Min(0) @Max(600) Integer shockMonths,
            @Valid RevisedPlan revisedPlan,
            @NotEmpty @Size(max = 10) List<@NotNull @Valid StressCondition> scenarios) {}
}
