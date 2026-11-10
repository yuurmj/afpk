import { useState } from "react";
import {
  calculateMonthlySurplus,
  caculateCashflowScenario,
  calculateGoalShortfall,
  calculateTemporaryShockGoal,
} from "../utils/calculations.js";
import { requestScenarioExplanation } from "../services/scenarioApi.js";
import { stressScenarios } from "../data/stressScenarios.js";
import "./ScenarioPage.scss";

export default function ScenarioPage({ customer }) {
  const [decreaseRate, setDecreaseRate] = useState("10");
  const [expenseIncreaseRate, setExpenseIncreaseRate] = useState("0");
  const [targetAmount, setTargetAmount] = useState("");
  const [remainingMonths, setRemainingMonths] = useState("");
  const [adjustedTargetAmount, setAdjustedTargetAmount] = useState("");
  const [adjustedMonths, setAdjustedTMonths] = useState("");
  const [adjustedMonthlySavings, setAdjustedMonthlySavings] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [shockMonths, setShockMonths] = useState("6");

  const incomeRate = Number(decreaseRate);
  const expenseRate = Number(expenseIncreaseRate);

  const isIncomeValid =
    decreaseRate !== "" &&
    Number.isFinite(incomeRate) &&
    incomeRate >= 0 &&
    incomeRate <= 100;

  const isExpenseValid =
    expenseIncreaseRate !== "" &&
    Number.isFinite(expenseRate) &&
    expenseRate >= 0;

  const isValid = isIncomeValid && isExpenseValid;

  const originalSurplus = calculateMonthlySurplus(customer);

  const scenario = isValid
    ? caculateCashflowScenario(customer, incomeRate, expenseRate)
    : null;

  const goalAmount = Number(targetAmount);
  const goalMonths = Number(remainingMonths);
  const shockDuration = Number(shockMonths);

  const isShockDurationValid =
    shockMonths.trim() !== "" &&
    Number.isInteger(shockDuration) &&
    shockDuration >= 0 &&
    Number.isInteger(goalMonths) &&
    goalMonths > 0 &&
    shockDuration <= goalMonths;

  const isGoalValid =
    targetAmount.trim() !== "" &&
    remainingMonths.trim() !== "" &&
    Number.isFinite(goalAmount) &&
    goalAmount > 0 &&
    Number.isInteger(goalMonths) &&
    goalMonths > 0;

  const originalGoal = isGoalValid
    ? calculateGoalShortfall(goalAmount, goalMonths, originalSurplus)
    : null;

  const scenarioGoal =
    isGoalValid && scenario
      ? calculateGoalShortfall(goalAmount, goalMonths, scenario.monthlySurplus)
      : null;

  const revisedAmount = Number(adjustedTargetAmount);
  const revisedMonths = Number(adjustedMonths);
  const revisedSavings = Number(adjustedMonthlySavings);

  const isAdjustmentValid =
    adjustedTargetAmount.trim() !== "" &&
    adjustedMonths.trim() !== "" &&
    adjustedMonthlySavings.trim() !== "" &&
    Number.isFinite(revisedAmount) &&
    revisedAmount > 0 &&
    Number.isInteger(revisedMonths) &&
    revisedMonths > 0 &&
    Number.isFinite(revisedSavings) &&
    revisedSavings >= 0;

  const availableMonthlySavings = scenario
    ? Math.max(scenario.monthlySurplus, 0)
    : null;

  const exceedsAvailableSavings =
    isAdjustmentValid &&
    availableMonthlySavings !== null &&
    revisedSavings > availableMonthlySavings;

  const adjustedGoal =
    scenarioGoal && isAdjustmentValid && !exceedsAvailableSavings
      ? calculateGoalShortfall(revisedAmount, revisedMonths, revisedSavings)
      : null;

  const stressResults = stressScenarios.map((condition) => {
    const cashflow = caculateCashflowScenario(
      customer,
      condition.incomeDecreaseRate,
      condition.expenseIncreaseRate,
    );

    const canCalculate = isGoalValid && isShockDurationValid;

    const goalResult = canCalculate
      ? calculateTemporaryShockGoal({
          targetAmount: goalAmount,
          remainingMonths: goalMonths,
          shockMonths: shockDuration,
          originalMonthlySurplus: originalSurplus,
          stressedMonthlySurplus: cashflow.monthlySurplus,
        })
      : null;

    const revisedResult =
      canCalculate && isAdjustmentValid
        ? calculateTemporaryShockGoal({
            targetAmount: revisedAmount,
            remainingMonths: revisedMonths,
            shockMonths: Math.min(shockDuration, revisedMonths),
            originalMonthlySurplus: originalSurplus,
            stressedMonthlySurplus: cashflow.monthlySurplus,
            plannedMonthlySavings: revisedSavings,
          })
        : null;

    return {
      ...condition,
      monthlySurplus: cashflow.monthlySurplus,
      goalResult,
      revisedResult,
    };
  });

  function formatAmount(amount) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }

  async function handleExplainScenario() {
    if (!scenarioGoal || isExplaining) return;

    setIsExplaining(true);
    setExplanation("");
    setExplanationError("");

    const data = {
      conditions: {
        incomeDecreaseRate: incomeRate,
        expenseIncreaseRate: expenseRate,
      },

      cashflow: {
        originalIncome: customer.monthlyNetIncome,
        changedIncome: scenario.reducedIncome,
        originalExpenses: customer.monthlyLivingExpenses,
        changedExpenses: scenario.increasedExpenses,
        monthlyLoanPayment: customer.monthlyLoanPayment,
        originalSurplus,
        changedSurplus: scenario.monthlySurplus,
      },

      goal: {
        targetAmount: goalAmount,
        remainingMonths: goalMonths,
        originalResult: originalGoal,
        scenarioResult: scenarioGoal,
      },

      adjustment: adjustedGoal
        ? {
            targetAmount: revisedAmount,
            remainingMonths: revisedMonths,
            monthlySavings: revisedSavings,
            result: adjustedGoal,
          }
        : null,

      stressTest:
        isGoalValid && isShockDurationValid
          ? {
              shockMonths: shockDuration,

              originalPlan: {
                targetAmount: goalAmount,
                remainingMonths: goalMonths,
                savingsPolicy: "양수인 월 잉여자금 전액 저축",
              },

              revisedPlan: isAdjustmentValid
                ? {
                    targetAmount: revisedAmount,
                    remainingMonths: revisedMonths,
                    plannedMonthlySavings: revisedSavings,
                  }
                : null,

              scenarios: stressResults.map((result) => ({
                name: result.name,
                incomeDecreaseRate: result.incomeDecreaseRate,
                expenseIncreaseRate: result.expenseIncreaseRate,
                stressedMonthlySurplus: result.monthlySurplus,
                originalResult: result.goalResult,
                revisedResult: result.revisedResult,
              })),
            }
          : null,

      assumptions: [
        "금액 단위는 원, 기간 단위는 개월",
        "현재 모아둔 목표자금, 이자, 물가 변동은 제외",
        "대출상환액은 모든 계산 기간 동안 동일하게 유지",

        "goal과 adjustment는 선택한 소득·지출 조건이 각 계획의 목표 기간 내내 유지되는 계산",
        "goal과 adjustment에서는 음수인 월 잉여자금을 저축 가능액 0원으로 처리하며, 현금흐름 적자 자체가 해결된 것은 아님",

        "stressTest는 지금부터 shockMonths 동안 각 충격이 지속되고 이후 기존 소득·지출로 복귀하는 계산",
        "수정 목표 기간이 충격 기간보다 짧으면 수정 목표일까지의 충격만 적용",
        "스트레스 테스트의 기존 계획은 양수인 월 잉여자금 전액을 저축",
        "스트레스 테스트의 수정 계획은 계획한 월 저축액과 해당 기간 잉여자금 중 작은 금액을 적용",
        "스트레스 테스트에서는 음수인 월 잉여자금을 마이너스 금액으로 합산",

        "저축액 초과 표시는 입력한 저축 계획을 그대로 실행하기 어렵다는 뜻",
        "최종 부족금액이 0원이어도 기간 중 적자가 있으면 별도 자금 대책이 필요",
        "기존 계획과 수정 계획은 목표금액·기간·저축액이 다를 수 있으므로 부족금액 차이만으로 우열을 단정하지 않음",
        "스트레스 조건은 개발용 가정이며 발생 확률이나 미래 예측이 아님",
        "stressTest가 null이면 유효한 스트레스 테스트 결과가 제공되지 않은 상태",
      ],
    };

    try {
      const result = await requestScenarioExplanation(data);
      setExplanation(result);
    } catch (error) {
      setExplanationError(
        error instanceof Error ? error.message : "설명을 불러오지 못했습니다.",
      );
    } finally {
      setIsExplaining(false);
    }
  }

  return (
    <section className="scenario-page">
      <header className="scenario-page__header">
        <h1>시나리오 비교</h1>
        <p>소득과 생활 지출이 달라졌을 때 월 현금흐름을 비교합니다.</p>
      </header>

      <section className="scenario-page__settings">
        <h2>변경 조건</h2>

        <div className="scenario-page__inputs">
          <div>
            <label htmlFor="income-decrease">실수령액 감소율 (%)</label>
            <input
              id="income-decrease"
              type="number"
              min="0"
              max="100"
              step="any"
              value={decreaseRate}
              onChange={(event) => setDecreaseRate(event.target.value)}
              aria-invalid={!isIncomeValid}
              aria-describedby="scenario-help"
            />
          </div>

          <div>
            <label htmlFor="expense-increase">생활지출 증가율 (%)</label>
            <input
              id="expense-increase"
              type="number"
              min="0"
              step="any"
              value={expenseIncreaseRate}
              onChange={(event) => setExpenseIncreaseRate(event.target.value)}
              aria-invalid={!isExpenseValid}
              aria-describedby="scenario-help"
            />
          </div>
        </div>

        <p id="scenario-help">
          {isValid
            ? "소득과 생활지출의 변화를 동시에 적용합니다. 대출상환액은 현재 금액을 유지합니다."
            : "소득 감소율은 0~100%, 생활지출 증가율은 0% 이상으로 입력해 주세요."}
        </p>
      </section>

      <section className="scenario-page__results">
        <h2>월 현금흐름 비교</h2>

        <table>
          <caption>현재 고객정보와 변경 조건 비교 · 월 기준</caption>

          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col">기본</th>
              <th scope="col">조건 변경 후</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <th scope="row">실수령액</th>
              <td className="amount">
                {formatAmount(customer.monthlyNetIncome)}
              </td>
              <td className="amount">
                {scenario ? formatAmount(scenario.reducedIncome) : "—"}
              </td>
            </tr>

            <tr>
              <th scope="row">생활지출</th>
              <td className="amount">
                {formatAmount(customer.monthlyLivingExpenses)}
              </td>
              <td className="amount">
                {scenario ? formatAmount(scenario.increasedExpenses) : "—"}
              </td>
            </tr>

            <tr>
              <th scope="row">대출상환액</th>
              <td className="amount">
                {formatAmount(customer.monthlyLoanPayment)}
              </td>
              <td className="amount">
                {formatAmount(customer.monthlyLoanPayment)}
              </td>
            </tr>

            <tr className="scenario-page__surplus">
              <th scope="row">잉여자금</th>
              <td className="amount">{formatAmount(originalSurplus)}</td>
              <td className="amount">
                {scenario ? formatAmount(scenario.monthlySurplus) : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {scenario && (
          <p className="scenario-page__message">
            {originalSurplus === scenario.monthlySurplus ? (
              "기본 상태와 동일합니다."
            ) : (
              <>
                매월 남는 금액이 기본 상태보다{" "}
                <strong>
                  {formatAmount(originalSurplus - scenario.monthlySurplus)}
                </strong>{" "}
                줄어듭니다.
              </>
            )}
          </p>
        )}
      </section>

      <section className="scenario-page__goal">
        <h2>목표자금 점검</h2>

        <div className="scenario-page__inputs">
          <div>
            <label htmlFor="target-amount">목표금액 (원)</label>
            <input
              id="target-amount"
              type="number"
              min="1"
              step="1"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="remaining-months">남은 기간 (개월)</label>
            <input
              id="remaining-months"
              type="number"
              min="1"
              value={remainingMonths}
              onChange={(event) => setRemainingMonths(event.target.value)}
            />
          </div>
        </div>

        <p id="goal-help">
          현재 모아둔 목표자금과 이자는 제외하고, 월 잉여자금 전액을 하나의
          목표에 저축한다고 가정합니다. 월 잉여자금이 적자이면 저축액은 0원으로
          계산합니다.
        </p>

        {originalGoal && (
          <table>
            <caption>
              입력한 기간 동안의 예상 저축액과 목표 대비 부족금액
            </caption>

            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col">기본</th>
                <th scope="col">조건 변경 후</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <th scope="row">월 저축 가능액</th>
                <td className="amount">
                  {formatAmount(originalGoal.monthlySavings)}
                </td>
                <td className="amount">
                  {scenarioGoal
                    ? formatAmount(scenarioGoal.monthlySavings)
                    : "—"}
                </td>
              </tr>

              <tr>
                <th scope="row">예상 저축액</th>
                <td className="amount">
                  {formatAmount(originalGoal.projectedSavings)}
                </td>
                <td className="amount">
                  {scenarioGoal
                    ? formatAmount(scenarioGoal.projectedSavings)
                    : "—"}
                </td>
              </tr>

              <tr className="scenario-page__surplus">
                <th scope="row">목표 대비 부족금액</th>
                <td className="amount">
                  {formatAmount(originalGoal.shortfall)}
                </td>
                <td className="amount">
                  {scenarioGoal ? formatAmount(scenarioGoal.shortfall) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="scenario-page__stress">
        <h2>스트레스 테스트</h2>

        <p>
          여러 소득·지출 조건에서 월 잉여자금과 목표 대비 부족금액을 비교합니다.
          아래 조건은 개발용 예시입니다.
        </p>

        <p>
          수정 계획은 아래 ‘계획 조정’ 입력값을 사용합니다. 계획한 월 저축액이
          잉여자금을 넘으면, 실제 가능한 금액으로 부족금액을 계산하고 초과
          여부를 별도로 표시합니다.
        </p>

        <div className="scenario-page__inputs">
          <div>
            <label htmlFor="shock-months">충격 지속 기간 (개월)</label>
            <input
              id="shock-months"
              type="number"
              min="0"
              max={isGoalValid ? goalMonths : undefined}
              step="1"
              value={shockMonths}
              onChange={(event) => setShockMonths(event.target.value)}
              aria-invalid={isGoalValid && !isShockDurationValid}
              aria-describedby="shock-duration-help"
            />
          </div>
        </div>

        <p id="shock-duration-help">
          {!isGoalValid
            ? "목표금액과 남은 기간을 먼저 입력해 주세요."
            : !isShockDurationValid
              ? `충격 기간은 0~${goalMonths}개월 사이의 정수로 입력해 주세요.`
              : `지금부터 ${shockDuration}개월간 충격이 지속되고, 이후에는 기존 소득·지출로 돌아온다고 가정합니다.`}
        </p>

        {!isGoalValid && (
          <p>
            위에서 목표금액과 남은 기간을 입력하면 목표 대비 부족금액도 함께
            표시됩니다.
          </p>
        )}

        <div className="scenario-page__table-scroll">
          <table>
            <caption>
              기존 계획과 수정 계획 각각의 목표금액·기간에 동일한 충격을
              적용합니다. 충격 종료 후에는 기존 소득·지출로 복귀하며, 현재
              목표자금과 이자는 제외합니다.
            </caption>

            <thead>
              <tr>
                <th scope="col">조건</th>
                <th scope="col">소득 감소</th>
                <th scope="col">지출 증가</th>
                <th scope="col">충격 중 월 잉여자금</th>
                <th scope="col">기존 계획 부족금액</th>
                <th scope="col">수정 계획 부족금액</th>
                <th scope="col">수정 월 저축액 점검</th>
              </tr>
            </thead>

            <tbody>
              {stressResults.map((result) => (
                <tr key={result.id}>
                  <th scope="row">{result.name}</th>

                  <td>{result.incomeDecreaseRate}%</td>
                  <td>{result.expenseIncreaseRate}%</td>

                  <td className="amount">
                    {formatAmount(result.monthlySurplus)}
                    {result.monthlySurplus < 0 && " (적자)"}
                  </td>

                  <td className="amount">
                    {result.goalResult
                      ? formatAmount(result.goalResult.shortfall)
                      : "—"}

                    {result.goalResult?.hasMonthlyDeficit && (
                      <span> · 기간 중 적자 발생</span>
                    )}
                  </td>

                  <td className="amount">
                    {result.revisedResult
                      ? formatAmount(result.revisedResult.shortfall)
                      : "—"}
                  </td>

                  <td>
                    {!result.revisedResult ? (
                      "—"
                    ) : (
                      <>
                        {result.revisedResult.exceedsMonthlyCapacity
                          ? "저축액이 잉여자금 초과"
                          : "잉여자금 범위 내"}

                        {result.revisedResult.hasMonthlyDeficit && (
                          <span> · 기간 중 적자 발생</span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="scenario-page__adjustment">
        <h2>계획 조정</h2>

        <p className="scenario-page__adjustment-help">
          위에서 입력한 소득·지출 조건을 유지하고, 목표금액과 기간, 월 저축액을
          조정합니다.
        </p>

        <div className="scenario-page__inputs">
          <div>
            <label htmlFor="adjusted-target">수정 목표금액 (원)</label>
            <input
              id="adjusted-target"
              type="number"
              min="1"
              step="1"
              value={adjustedTargetAmount}
              onChange={(event) => setAdjustedTargetAmount(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="adjusted-months">수정 기간 (개월)</label>
            <input
              id="adjusted-months"
              type="number"
              min="1"
              step="1"
              value={adjustedMonths}
              onChange={(event) => setAdjustedTMonths(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="adjusted-savings">수정 월 저축액 (원)</label>
            <input
              id="adjusted-savings"
              type="number"
              min="0"
              step="1"
              value={adjustedMonthlySavings}
              onChange={(event) =>
                setAdjustedMonthlySavings(event.target.value)
              }
              aria-describedby="adjustment-help"
              aria-invalid={exceedsAvailableSavings}
            />
          </div>
        </div>

        <p id="adjustment-help">
          {!scenarioGoal
            ? "먼저 위의 변경 조건과 목표금액, 남은 기간을 올바르게 입력해 주세요."
            : exceedsAvailableSavings
              ? `월 저축액은 조건 변경 후 저축 가능한 금액인 ${formatAmount(availableMonthlySavings)}을 넘을 수 없습니다.`
              : `조건 변경 후 월 저축 가능한 금액은 ${formatAmount(availableMonthlySavings)}입니다. 현재 모아둔 목표자금과 이자는 제외합니다.`}
        </p>

        {adjustedGoal && (
          <>
            <h3 className="scenario-page__comparison-title">
              계획 수정 전후 비교
            </h3>
            <table>
              <caption>
                선택한 소득·지출 조건이 각 계획의 목표 기간 내내 유지되는 경우
              </caption>

              <thead>
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col">수정 전</th>
                  <th scope="col">수정 후</th>
                </tr>
              </thead>

              <tbody>
                {[
                  [
                    "목표금액",
                    formatAmount(goalAmount),
                    formatAmount(revisedAmount),
                  ],
                  ["남은 기간", `${goalMonths}개월`, `${revisedMonths}개월`],
                  [
                    "월 저축액",
                    formatAmount(scenarioGoal.monthlySavings),
                    formatAmount(adjustedGoal.monthlySavings),
                  ],
                  [
                    "예상 저축액",
                    formatAmount(scenarioGoal.projectedSavings),
                    formatAmount(adjustedGoal.projectedSavings),
                  ],
                  [
                    "목표 대비 부족금액",
                    formatAmount(scenarioGoal.shortfall),
                    formatAmount(adjustedGoal.shortfall),
                  ],
                ].map(([label, before, after]) => (
                  <tr
                    key={label}
                    className={
                      label === "목표 대비 부족금액"
                        ? "scenario-page__surplus"
                        : ""
                    }
                  >
                    <th scope="row">{label}</th>
                    <td className="amount">{before}</td>
                    <td className="amount">{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="scenario-page__explanation">
        <h2>계산 결과 설명</h2>
        <p className="scenario-page__explanation-help">
          입력한 조건과 계산 결과를 바탕으로, 부족금액이 발생한 원인과 계획 조정
          시 고려할 점을 설명합니다.
        </p>

        <button
          type="button"
          className="scenario-page__explain-button"
          onClick={handleExplainScenario}
          disabled={!scenarioGoal || isExplaining}
        >
          {isExplaining ? "설명 불러오는 중…" : "계산 결과 설명 보기"}
        </button>

        {!scenarioGoal && (
          <p className="scenario-page__explanation-help">
            변경 조건과 목표금액, 남은 기간을 먼저 입력해 주세요.
          </p>
        )}

        <div aria-live="polite" aria-busy={isExplaining}>
          {explanationError && (
            <p className="scenario-page__explanation-error">
              {explanationError}
            </p>
          )}

          {explanation && (
            <div className="scenario-page__explanation-result">
              {explanation}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
