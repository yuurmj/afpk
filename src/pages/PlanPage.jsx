import { useState } from "react";
import {
  calculateMonthlySurplus,
  calculateNetWorth,
} from "../utils/calculations.js";
import {
  allocationPeriods,
  allocationItems,
} from "../data/allocationPlan.js";
import "./PlanPage.scss";

export default function PlanPage({ customer, onCustomerChange }) {
  const [isEditing, setIsEditing] = useState(false);

  const monthlySurplus = calculateMonthlySurplus(customer);
  const netWorth = calculateNetWorth(customer);

  // 배분표에는 학자금 상환이 포함되어 있으므로,
  // 대출상환액을 빼기 전 금액(실수령액 - 생활지출)과 비교합니다.
  const availableForPlan =
    customer.monthlyNetIncome - customer.monthlyLivingExpenses;

  const periodTotals = allocationPeriods.map((_, index) =>
    allocationItems.reduce((total, item) => total + item.monthly[index], 0),
  );

  function formatAmount(amount) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onCustomerChange({
      ...customer,
      monthlyNetIncome: Number(formData.get("income")),
      monthlyLivingExpenses: Number(formData.get("expenses")),
      monthlyLoanPayment: Number(formData.get("repayment")),
    });

    setIsEditing(false);
  }

  return (
    <section className="plan-page">
      <header className="plan-page__header">
        <div>
          <h1>재무계획</h1>
          <p>
            가상 고객 01 · {customer.age}세 · {customer.occupation}
          </p>
        </div>

        <button
          type="button"
          className="plan-page__edit-button"
          aria-expanded={isEditing}
          aria-controls="customer-edit-form"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "취소" : "수정"}
        </button>
      </header>

      {isEditing && (
        <form
          id="customer-edit-form"
          className="plan-page__form"
          onSubmit={handleSubmit}
        >
          <label>
            월 실수령액 (원)
            <input
              name="income"
              type="number"
              min="0"
              step="1"
              defaultValue={customer.monthlyNetIncome}
              required
            />
          </label>

          <label>
            월 생활지출 (원)
            <input
              name="expenses"
              type="number"
              min="0"
              step="1"
              defaultValue={customer.monthlyLivingExpenses}
              required
            />
          </label>

          <label>
            월 대출상환액 (원)
            <input
              name="repayment"
              type="number"
              min="0"
              step="1"
              defaultValue={customer.monthlyLoanPayment}
              required
            />
          </label>
          <button type="submit">저장</button>
        </form>
      )}

      <section className="plan-page__cashflow">
        <h2>월 잉여자금</h2>

        <p className="plan-page__surplus amount">
          {monthlySurplus.toLocaleString("ko-KR")}
          <span>원</span>
        </p>

        <p className="plan-page__description">
          생활 지출과 대출상환액을 제외한 금액입니다. 비상자금과 목표별 저축에
          배분하기 전입니다.
        </p>

        <dl className="plan-page__flow">
          <div>
            <dt>실수령액</dt>
            <dd className="amount">
              {formatAmount(customer.monthlyNetIncome)}
            </dd>
          </div>

          <div>
            <dt>생활 지출</dt>
            <dd className="amount">
              - {formatAmount(customer.monthlyLivingExpenses)}
            </dd>
          </div>

          <div>
            <dt>대출 상환</dt>
            <dd className="amount">
              - {formatAmount(customer.monthlyLoanPayment)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="plan-page__assets">
        <h2>현재 자산과 부채</h2>

        <dl className="plan-page__balance">
          <div>
            <dt>총 자산</dt>
            <dd className="amount">{formatAmount(customer.totalAssets)}</dd>
          </div>

          <div>
            <dt>학자금 대출</dt>
            <dd className="amount">{formatAmount(customer.totalDebt)}</dd>
          </div>

          <div className="plan-page__net-worth">
            <dt>순자산</dt>
            <dd className="amount">{formatAmount(netWorth)}</dd>
          </div>
        </dl>
      </section>

      <section className="plan-page__goals">
        <h2 id="savings-plan-heading">연차별 월 저축 배분</h2>

        <p className="plan-page__description">
          팀 재무설계안의 배분 계획을, 월 실수령액에서 생활지출을 뺀 금액과
          비교합니다. 학자금 상환은 배분표에 포함되어 있습니다.
        </p>

        <table
          className="plan-page__goal-table"
          aria-labelledby="savings-plan-heading"
        >
          <caption>항목별 월 배분액</caption>

          <thead>
            <tr>
              <th scope="col">항목</th>
              {allocationPeriods.map((period) => (
                <th scope="col" key={period}>
                  {period}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {allocationItems.map((item) => (
              <tr key={item.id}>
                <th scope="row">{item.name}</th>
                {item.monthly.map((amount, index) => (
                  <td className="amount" key={allocationPeriods[index]}>
                    {amount === 0 ? "—" : formatAmount(amount)}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="plan-page__total-row">
              <th scope="row">배분 합계</th>
              {periodTotals.map((total, index) => (
                <td className="amount" key={allocationPeriods[index]}>
                  {formatAmount(total)}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row">배분 가능 재원 대비</th>
              {periodTotals.map((total, index) => {
                const gap = availableForPlan - total;
                return (
                  <td
                    className={`amount${gap < 0 ? " plan-page__over" : ""}`}
                    key={allocationPeriods[index]}
                  >
                    {gap < 0
                      ? `${formatAmount(-gap)} 초과`
                      : `${formatAmount(gap)} 여유`}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <p className="plan-page__description">
          배분 가능 재원은 월 {formatAmount(availableForPlan)}입니다(실수령액 -
          생활지출). 소득과 지출이 현재 수준으로 유지된다고 가정하며, 보고서의
          만원 단위 값을 원 단위로 환산했습니다.
        </p>
      </section>
    </section>
  );
}
