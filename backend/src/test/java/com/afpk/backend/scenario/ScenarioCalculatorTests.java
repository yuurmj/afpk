package com.afpk.backend.scenario;

import com.afpk.backend.common.ApiException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ScenarioCalculatorTests {
    private final ScenarioCalculator calculator = new ScenarioCalculator();

    private ScenarioAnalysisRequest request(ScenarioAnalysisRequest.Adjustment adjustment,
                                            ScenarioAnalysisRequest.StressTest stress) {
        return new ScenarioAnalysisRequest(
                new ScenarioAnalysisRequest.Conditions(new BigDecimal("10"), BigDecimal.ZERO),
                new ScenarioAnalysisRequest.Cashflow(3_019_950L, 1_486_190L, 164_830L),
                new ScenarioAnalysisRequest.Goal(20_000_000L, 12), adjustment, stress);
    }

    @Test
    void reproducesTheCurrentFrontendExample() {
        var result = calculator.calculate(request(null, null));
        var cashflow = (Map<?, ?>) result.get("cashflow");
        assertThat(cashflow.get("originalSurplus")).isEqualTo(1_368_930L);
        assertThat(cashflow.get("changedSurplus")).isEqualTo(1_066_935L);
        var goal = (Map<?, ?>) result.get("goal");
        assertThat(goal.get("originalResult")).isEqualTo(
                new ScenarioCalculator.GoalResult(1_368_930, 16_427_160, 3_572_840, false));
        assertThat(result.get("adjustment")).isNull();
        assertThat(result.get("stressTest")).isNull();
    }

    @Test
    void roundsHalfAWonUpAndHandlesFullIncomeLoss() {
        var cash = new ScenarioAnalysisRequest.Cashflow(3_019_950L, 1_486_190L, 164_830L);
        var result = calculator.cashflow(cash, new ScenarioAnalysisRequest.Conditions(
                new BigDecimal("20"), new BigDecimal("15")));
        assertThat(result).containsEntry("increasedExpenses", 1_709_119L).containsEntry("monthlySurplus", 542_011L);
        assertThat(calculator.cashflow(cash, new ScenarioAnalysisRequest.Conditions(
                new BigDecimal("100"), BigDecimal.ZERO))).containsEntry("reducedIncome", 0L);
    }

    @Test
    void preservesDeficitsAndZeroSavingsInTemporaryShocks() {
        assertThat(calculator.goal(1000, 12, -50)).isEqualTo(new ScenarioCalculator.GoalResult(0, 0, 1000, false));
        assertThat(calculator.shock(1000, 12, 6, 100, -50, null)).isEqualTo(
                new ScenarioCalculator.ShockResult(6, 6, 300, 300, 700, true, false));
        assertThat(calculator.shock(1000, 12, 6, 100, -50, 0L)).isEqualTo(
                new ScenarioCalculator.ShockResult(6, 6, -300, 0, 1000, true, false));
        assertThat(calculator.shock(1000, 12, 0, 100, -50, null).hasMonthlyDeficit()).isFalse();
        assertThat(calculator.shock(1000, 12, 12, -50, 100, null).hasMonthlyDeficit()).isFalse();
    }

    @Test
    void clipsTheShockToTheRevisedHorizonAndFlagsExcessSavings() {
        var stress = new ScenarioAnalysisRequest.StressTest(6,
                new ScenarioAnalysisRequest.RevisedPlan(10_000_000L, 3, 2_000_000L),
                List.of(new ScenarioAnalysisRequest.StressCondition("소득 감소", new BigDecimal("10"), BigDecimal.ZERO, null)));
        var result = calculator.calculate(request(null, stress));
        var test = (Map<?, ?>) result.get("stressTest");
        var item = (Map<?, ?>) ((List<?>) test.get("scenarios")).getFirst();
        assertThat(item.get("originalResult")).isEqualTo(
                new ScenarioCalculator.ShockResult(6, 6, 14_615_190, 14_615_190, 5_384_810, false, false));
        var revised = (ScenarioCalculator.ShockResult) item.get("revisedResult");
        assertThat(revised.shockMonths()).isEqualTo(3);
        assertThat(revised.normalMonths()).isZero();
        assertThat(revised.exceedsMonthlyCapacity()).isTrue();
    }

    @Test
    void addsOneTimeCostsOnceToBothPlansEvenWithNoShockMonths() {
        var stress = new ScenarioAnalysisRequest.StressTest(0,
                new ScenarioAnalysisRequest.RevisedPlan(10_000_000L, 3, 1_000_000L),
                List.of(new ScenarioAnalysisRequest.StressCondition("부모 지원 취소", BigDecimal.ZERO,
                        BigDecimal.ZERO, 50_000_000L)));
        var result = calculator.calculate(request(null, stress));
        var test = (Map<?, ?>) result.get("stressTest");
        var item = (Map<?, ?>) ((List<?>) test.get("scenarios")).getFirst();
        assertThat(item.get("extraCost")).isEqualTo(50_000_000L);
        assertThat(item.get("effectiveOriginalTargetAmount")).isEqualTo(70_000_000L);
        assertThat(item.get("effectiveRevisedTargetAmount")).isEqualTo(60_000_000L);
        assertThat(((ScenarioCalculator.ShockResult) item.get("originalResult")).shortfall()).isEqualTo(53_572_840L);
        assertThat(((ScenarioCalculator.ShockResult) item.get("revisedResult")).shortfall()).isEqualTo(57_000_000L);
    }

    @Test
    void rejectsImpossibleAdjustmentAndShockDuration() {
        assertThatThrownBy(() -> calculator.calculate(request(
                new ScenarioAnalysisRequest.Adjustment(1000L, 12, 2_000_000L), null)))
                .isInstanceOf(ApiException.class).hasMessageContaining("저축 가능한");
        var stress = new ScenarioAnalysisRequest.StressTest(13, null,
                List.of(new ScenarioAnalysisRequest.StressCondition("기본", BigDecimal.ZERO, BigDecimal.ZERO, null)));
        assertThatThrownBy(() -> calculator.calculate(request(null, stress)))
                .isInstanceOf(ApiException.class).hasMessageContaining("남은 기간");
    }
}
