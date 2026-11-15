package com.afpk.backend.review;
import com.afpk.backend.scenario.ScenarioAnalysisRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record PlanReviewRequest(
    @NotNull @Valid Customer customer,
    @NotEmpty @Size(max=10) List<@NotBlank @Size(max=40) String> allocationPeriods,
    @NotEmpty @Size(max=30) List<@NotNull @Valid Allocation> allocationItems,
    @Valid ScenarioAnalysisRequest scenario,
    @Valid MonteCarlo monteCarlo,
    boolean adjustmentExceedsCapacity,
    @Min(0) @Max(1000000000000L) Long allocationExpenseReduction,
    @Valid PlanStress planStress) {
  public record PlanStress(
      @NotNull @Size(min=4,max=4) List<@NotNull @Min(1) @Max(60) Integer> periodMonths,
      @NotNull @DecimalMin("0") @DecimalMax("1") Double isaStockRatio,
      @NotNull @DecimalMin("0") @DecimalMax("1") Double isaDropRate) {}
  public record Customer(@Min(0) @Max(120) int age, @NotBlank @Size(max=80) String occupation,
      @NotNull @Min(0) @Max(1000000000000L) Long monthlyNetIncome,
      @NotNull @Min(0) @Max(1000000000000L) Long monthlyLivingExpenses,
      @NotNull @Min(0) @Max(1000000000000L) Long monthlyLoanPayment,
      @NotNull @Min(0) @Max(1000000000000L) Long totalAssets,
      @NotNull @Min(0) @Max(1000000000000L) Long totalDebt) {}
  public record Allocation(@NotBlank @Size(max=80) String id, @NotBlank @Size(max=80) String name,
      @NotEmpty @Size(max=10) List<@NotNull @Min(0) @Max(1000000000000L) Long> monthly) {}
  public record MonteCarlo(@Min(1) @Max(10000) int runs,
      @DecimalMin("0") @DecimalMax("1") double incomeVolatility,
      @DecimalMin("0") @DecimalMax("1") double expenseVolatility,
      @DecimalMin("0") @DecimalMax("1") double successRate,
      @Min(0) @Max(1000000000000000L) long p10,
      @Min(0) @Max(1000000000000000L) long median,
      @Min(0) @Max(1000000000000000L) long p90) {}
}
