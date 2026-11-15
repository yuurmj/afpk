import { calculatePlanStress, PLAN_PERIOD_MONTHS } from "../utils/calculations.js";
import {
  planStressScenarios,
  ISA_STOCK_RATIO,
  ISA_DROP_RATE,
} from "../data/planStressScenarios.js";
import { allocationPeriods, expenseReduction } from "../data/allocationPlan.js";
import "./PlanStressTest.scss";

const won = (amount) => `${Math.abs(amount).toLocaleString("ko-KR")}원`;

function GapCell({ value }) {
  if (value === 0) return <td className="amount">0원</td>;
  return (
    <td className={`amount${value < 0 ? " plan-stress__short" : ""}`}>
      {value < 0 ? `${won(value)} 부족` : `${won(value)} 여유`}
    </td>
  );
}

export default function PlanStressTest({ customer, allocationItems }) {
  const results = planStressScenarios.map((scenario) => ({
    scenario,
    ...calculatePlanStress({
      customer,
      allocationItems,
      expenseReduction: expenseReduction.monthly,
      scenario,
      isaStockRatio: ISA_STOCK_RATIO,
      isaDropRate: ISA_DROP_RATE,
    }),
  }));

  return (
    <section className="plan-stress" aria-labelledby="plan-stress-heading">
      <h2 id="plan-stress-heading">설계안 충격 점검 (6단계 모니터링)</h2>

      <p className="plan-stress__help">
        위 연차별 배분 계획이 소득·지출·시장 충격에서도 유지되는지 점검합니다.
        모든 충격은 5년 내내 지속되는 최악의 상황을 가정하며, 발생 확률이나
        예측이 아닙니다.
      </p>

      <div className="plan-stress__scroll">
        <table>
          <caption>충격 조건별 월 배분 과부족 (월 가용 재원 − 월 배분 합계)</caption>

          <thead>
            <tr>
              <th scope="col">조건</th>
              <th scope="col">월 가용 재원</th>
              {allocationPeriods.map((period) => (
                <th scope="col" key={period}>
                  {period}
                </th>
              ))}
              <th scope="col">5년 누적 과부족</th>
              <th scope="col">유동성 자금 활용 후 부족</th>
              <th scope="col">ISA 평가손실</th>
            </tr>
          </thead>

          <tbody>
            {results.map((result) => (
              <tr key={result.scenario.id}>
                <th scope="row">
                  {result.scenario.name}
                  <br />
                  <small>{result.scenario.description}</small>
                </th>
                <td className="amount">{won(result.available)}</td>
                {result.yearly.map((year, index) => (
                  <GapCell value={year.gap} key={allocationPeriods[index]} />
                ))}
                <GapCell value={result.cumulativeGap} />
                <td
                  className={`amount${result.uncoveredTotal > 0 ? " plan-stress__short" : ""}`}
                >
                  {result.uncoveredTotal > 0 ? won(result.uncoveredTotal) : "없음"}
                </td>
                <td className="amount">
                  {result.isaLoss > 0 ? won(result.isaLoss) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="plan-stress__criteria">
        <summary>계산 기준</summary>
        <p>
          월 가용 재원은 실수령액에서 생활지출을 뺀 금액이며, 설계안의{" "}
          {expenseReduction.label} 절감 {won(expenseReduction.monthly)}을
          반영합니다(식비 절감 미이행 조건에서는 제외). 학자금 상환은 배분표에
          포함되어 있어 다시 차감하지 않습니다. 과부족은 연차별 월 배분 합계와
          비교한 값이고, 5년 누적은 {PLAN_PERIOD_MONTHS.join("·")}개월(1년차,
          2년차, 3년차, 4~5년차)에 각각 곱해 더한 값입니다. 유동성 자금 활용 후
          부족은 부족액을 보고서에서 조건부 재배분 대상으로 둔 ‘결혼·주거
          유동성 자금’ 배분액으로 먼저 충당하고도 남는 금액의 5년 합계입니다.
          ISA 평가손실은 코로나19 당시 코스피 고점 대비 하락률 약{" "}
          {Math.round(ISA_DROP_RATE * 100)}%를 ISA 주식 비중{" "}
          {Math.round(ISA_STOCK_RATIO * 100)}%에 적용한 5년간 납입액 기준
          평가손실이며, 현금흐름과 별개로 평가액이 줄어드는 금액입니다.
        </p>
      </details>
    </section>
  );
}
