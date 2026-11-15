import { useState } from "react";
import {
  calculateMonthlySurplus,
  calculateNetWorth,
} from "../utils/calculations.js";
import {
  allocationPeriods,
  expenseReduction,
} from "../data/allocationPlan.js";
import "./PlanPage.scss";

export default function PlanPage({ customer, onCustomerChange, allocationItems, onAllocationChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(false);
  const [formError, setFormError] = useState("");

  const monthlySurplus = calculateMonthlySurplus(customer);
  const netWorth = calculateNetWorth(customer);

  // 배분표에는 학자금 상환이 포함되어 있으므로 대출상환액을 빼기 전 금액,
  // 즉 설계안의 지출 절감을 반영한 (실수령액 - 생활지출)과 비교합니다.
  const availableForPlan =
    customer.monthlyNetIncome -
    (customer.monthlyLivingExpenses - expenseReduction.monthly);

  const periodTotals = allocationPeriods.map((_, index) =>
    allocationItems.reduce((total, item) => total + item.monthly[index], 0),
  );

  // 보고서 합계 행과 같은 값: 학자금 상환·비상자금을 뺀 저축·투자 소계
  const investmentTotals = allocationPeriods.map((_, index) =>
    allocationItems
      .filter((item) => !item.fixedOutflow)
      .reduce((total, item) => total + item.monthly[index], 0),
  );

  function formatAmount(amount) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const numbers = ["age", "income", "expenses", "repayment", "assets", "debt"].map(name => Number(formData.get(name)));
    if (numbers.some(value => !Number.isSafeInteger(value) || value < 0 || value > 1e12) || numbers[0] > 120 || !String(formData.get("occupation")).trim()) {
      setFormError("나이·금액은 허용 범위의 정수로, 직업은 빈칸 없이 입력해 주세요."); return;
    }
    setFormError("");
    onCustomerChange({
      ...customer,
      age: numbers[0], occupation: String(formData.get("occupation")).trim(),
      totalAssets: numbers[4], totalDebt: numbers[5],
      monthlyNetIncome: Number(formData.get("income")),
      monthlyLivingExpenses: Number(formData.get("expenses")),
      monthlyLoanPayment: Number(formData.get("repayment")),
    });

    setIsEditing(false);
  }

  function handleAllocationSave(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated = allocationItems.map(item => ({ ...item,
      monthly: item.monthly.map((_, index) => Number(form.get(`${item.id}-${index}`))) }));
    if (updated.some(item => item.monthly.some(value => !Number.isSafeInteger(value) || value < 0 || value > 1e12))) return;
    onAllocationChange(updated); setEditingAllocation(false);
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
          onClick={() => { setIsEditing(!isEditing); setFormError(""); }}
        >
          {isEditing ? "입력 취소" : "고객정보 수정"}
        </button>
      </header>

      {isEditing && (
        <form
          id="customer-edit-form"
          className="plan-page__form"
          onSubmit={handleSubmit}
        >
          <p className="plan-page__form-help">가상 고객의 정보를 입력하세요. 금액은 원 단위이며, 현재 입력값은 이 화면을 새로고침하면 초기화됩니다.</p>
          <label>나이 (세)<input name="age" type="number" min="0" max="120" step="1" defaultValue={customer.age} required /></label>
          <label>직업<input name="occupation" type="text" maxLength="80" defaultValue={customer.occupation} required /></label>
          <label>총자산 (원)<input name="assets" type="number" min="0" max="1000000000000" step="1" defaultValue={customer.totalAssets} required /></label>
          <label>총부채 (원)<input name="debt" type="number" min="0" max="1000000000000" step="1" defaultValue={customer.totalDebt} required /></label>
          <label>
            월 실수령액 (원)
            <input
              name="income"
              type="number"
              min="0"
              max="1000000000000"
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
              max="1000000000000"
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
              max="1000000000000"
              step="1"
              defaultValue={customer.monthlyLoanPayment}
              required
            />
          </label>
          {formError && <p role="alert" className="plan-page__form-help">{formError}</p>}
          <button type="submit">고객정보 저장</button>
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
            <dt>총부채</dt>
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
          입력한 배분 계획을, 월 실수령액에서 생활지출을 뺀 금액과
          비교합니다. 기본값은 팀 보고서 예시이며 다른 고객을 검토할 때에는 배분 계획도 함께 수정하세요. 학자금 상환은 배분표에 포함되어 있습니다.
        </p>

        <button type="button" className="plan-page__edit-button" aria-expanded={editingAllocation}
          onClick={() => setEditingAllocation(!editingAllocation)}>{editingAllocation ? "배분 수정 취소" : "배분 계획 수정"}</button>
        {editingAllocation && <form className="plan-page__allocation-form" onSubmit={handleAllocationSave}>
          <p>고객에게 맞는 항목별 월 배분액을 입력하세요. 각 기간의 모든 금액은 월 기준입니다.</p>
          {allocationItems.map(item => <fieldset key={item.id}><legend>{item.name}</legend>
            {item.monthly.map((amount, index) => <label key={index}>{allocationPeriods[index]} (원)
              <input aria-label={`${item.name} ${allocationPeriods[index]} (원)`} name={`${item.id}-${index}`} type="number"
                min="0" max="1000000000000" step="1" defaultValue={amount} required />
            </label>)}
          </fieldset>)}
          <button className="plan-page__edit-button" type="submit">배분 계획 저장</button>
        </form>}
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

            <tr>
              <th scope="row">저축·투자 소계</th>
              {investmentTotals.map((total, index) => (
                <td className="amount" key={allocationPeriods[index]}>
                  {formatAmount(total)}
                </td>
              ))}
            </tr>

            <tr className="plan-page__total-row">
              <th scope="row">배분 합계 (학자금·비상자금 포함)</th>
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
          생활지출). 설계안의 {expenseReduction.label} 절감{" "}
          {formatAmount(expenseReduction.monthly)}을 반영했으며, 소득은 현재
          수준으로 유지된다고 가정합니다. 보고서의 만원 단위 값은 원 단위로
          환산했습니다.
        </p>
      </section>
    </section>
  );
}
