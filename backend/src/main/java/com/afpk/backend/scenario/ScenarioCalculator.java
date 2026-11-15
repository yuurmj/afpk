package com.afpk.backend.scenario;

import com.afpk.backend.common.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ScenarioCalculator {
    private static final List<String> ASSUMPTIONS = List.of(
            "금액 단위는 원, 기간 단위는 개월. calculationVersion=2",
            "이미 모은 목표자금, 이자, 물가 변동은 제외하고 대출상환액은 전 기간 동일하다.",
            "goal과 adjustment는 선택한 조건이 목표 기간 전체에 유지되며 음수 잉여자금은 저축 가능액 0원으로 처리한다. 적자가 해결되었다는 뜻은 아니다.",
            "stressTest는 시작 시점부터 충격이 지속된 후 원래 소득·지출로 복귀한다. 수정 목표가 더 짧으면 해당 기간만 충격을 반영한다.",
            "스트레스 테스트는 음수 잉여자금도 합산하고 최종 예상 저축액만 0원 이상으로 제한한다.",
            "extraCost는 충격 기간과 무관한 일회성 추가 필요 자금이며 기존·수정 목표금액에 각각 한 번 더한다. 추가 비용이 생기는 시점의 현금흐름은 계산하지 않는다.",
            "스트레스 테스트 수정 계획의 월 기여액은 계획 저축액과 해당 기간 잉여자금 중 작은 값이다. 저축액 초과와 월 적자 여부를 별도로 표시한다.",
            "부족금액이 0이어도 중간 월 적자가 있으면 별도 자금 대책이 필요하다.",
            "목표금액·기간·저축액이 다른 계획은 부족금액 차이만으로 우열을 판단하지 않는다.",
            "스트레스 조건은 예시 가정이며 발생 확률이나 미래 예측이 아니다. null인 분석은 제공되지 않은 것이다.");

    public record GoalResult(long monthlySavings, long projectedSavings, long shortfall, boolean isAchievable) {}
    public record ShockResult(int normalMonths, int shockMonths, long totalNetCashflow,
                              long projectedSavings, long shortfall, boolean hasMonthlyDeficit,
                              boolean exceedsMonthlyCapacity) {}

    public Map<String, Object> calculate(ScenarioAnalysisRequest request) {
        var cash = request.cashflow();
        long originalSurplus = cash.originalIncome() - cash.originalExpenses() - cash.monthlyLoanPayment();
        var changed = cashflow(cash, request.conditions());
        long changedSurplus = changed.get("monthlySurplus");
        var goal = request.goal();
        Map<String, Object> analysis = new LinkedHashMap<>();
        analysis.put("calculationVersion", 2);
        analysis.put("conditions", request.conditions());
        analysis.put("cashflow", Map.of(
                "originalIncome", cash.originalIncome(), "changedIncome", changed.get("reducedIncome"),
                "originalExpenses", cash.originalExpenses(), "changedExpenses", changed.get("increasedExpenses"),
                "monthlyLoanPayment", cash.monthlyLoanPayment(), "originalSurplus", originalSurplus,
                "changedSurplus", changedSurplus));
        analysis.put("goal", Map.of("targetAmount", goal.targetAmount(), "remainingMonths", goal.remainingMonths(),
                "originalResult", goal(goal.targetAmount(), goal.remainingMonths(), originalSurplus),
                "scenarioResult", goal(goal.targetAmount(), goal.remainingMonths(), changedSurplus)));

        Map<String, Object> adjustment = null;
        if (request.adjustment() != null) {
            var revised = request.adjustment();
            if (revised.monthlySavings() > Math.max(changedSurplus, 0)) {
                throw invalid("수정 월 저축액이 조건 변경 후 저축 가능한 금액을 초과합니다.");
            }
            adjustment = Map.of("targetAmount", revised.targetAmount(), "remainingMonths", revised.remainingMonths(),
                    "monthlySavings", revised.monthlySavings(),
                    "result", goal(revised.targetAmount(), revised.remainingMonths(), revised.monthlySavings()));
        }
        analysis.put("adjustment", adjustment);

        Map<String, Object> stress = null;
        if (request.stressTest() != null) {
            var test = request.stressTest();
            if (test.shockMonths() > goal.remainingMonths()) {
                throw invalid("충격 지속 기간은 기존 목표의 남은 기간을 넘을 수 없습니다.");
            }
            var results = test.scenarios().stream().map(condition -> {
                long extraCost = condition.extraCost() == null ? 0 : condition.extraCost();
                long surplus = cashflow(cash, new ScenarioAnalysisRequest.Conditions(
                        condition.incomeDecreaseRate(), condition.expenseIncreaseRate())).get("monthlySurplus");
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("name", condition.name());
                result.put("incomeDecreaseRate", condition.incomeDecreaseRate());
                result.put("expenseIncreaseRate", condition.expenseIncreaseRate());
                result.put("extraCost", extraCost);
                result.put("effectiveOriginalTargetAmount", goal.targetAmount() + extraCost);
                result.put("stressedMonthlySurplus", surplus);
                result.put("originalResult", shock(goal.targetAmount() + extraCost, goal.remainingMonths(), test.shockMonths(),
                        originalSurplus, surplus, null));
                var revised = test.revisedPlan();
                result.put("effectiveRevisedTargetAmount", revised == null ? null : revised.targetAmount() + extraCost);
                result.put("revisedResult", revised == null ? null : shock(revised.targetAmount() + extraCost,
                        revised.remainingMonths(), Math.min(test.shockMonths(), revised.remainingMonths()),
                        originalSurplus, surplus, revised.plannedMonthlySavings()));
                return result;
            }).toList();
            stress = new LinkedHashMap<>();
            stress.put("shockMonths", test.shockMonths());
            stress.put("originalPlan", goal);
            stress.put("revisedPlan", test.revisedPlan());
            stress.put("scenarios", results);
        }
        analysis.put("stressTest", stress);
        analysis.put("assumptions", ASSUMPTIONS);
        return analysis;
    }

    Map<String, Long> cashflow(ScenarioAnalysisRequest.Cashflow cash, ScenarioAnalysisRequest.Conditions condition) {
        long income = rounded(cash.originalIncome(), BigDecimal.ONE.subtract(condition.incomeDecreaseRate().movePointLeft(2)));
        long expenses = rounded(cash.originalExpenses(), BigDecimal.ONE.add(condition.expenseIncreaseRate().movePointLeft(2)));
        return Map.of("reducedIncome", income, "increasedExpenses", expenses,
                "monthlySurplus", income - expenses - cash.monthlyLoanPayment());
    }

    private long rounded(long amount, BigDecimal factor) {
        return BigDecimal.valueOf(amount).multiply(factor).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    GoalResult goal(long target, int months, long surplus) {
        long monthlySavings = Math.max(surplus, 0);
        long savings = monthlySavings * months;
        long shortfall = Math.max(target - savings, 0);
        return new GoalResult(monthlySavings, savings, shortfall, shortfall == 0);
    }

    ShockResult shock(long target, int months, int shockMonths, long original, long stressed, Long planned) {
        long limit = planned == null ? Long.MAX_VALUE : planned;
        int normalMonths = months - shockMonths;
        long total = Math.min(original, limit) * normalMonths + Math.min(stressed, limit) * shockMonths;
        long savings = Math.max(total, 0);
        boolean deficit = (shockMonths > 0 && stressed < 0) || (normalMonths > 0 && original < 0);
        boolean exceeds = planned != null && ((shockMonths > 0 && planned > Math.max(stressed, 0))
                || (normalMonths > 0 && planned > Math.max(original, 0)));
        return new ShockResult(normalMonths, shockMonths, total, savings, Math.max(target - savings, 0), deficit, exceeds);
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", message);
    }
}
