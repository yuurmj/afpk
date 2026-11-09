import { useState } from 'react';
import { calculateMonthlySurplus, calculateNetWorth } from '../utils/calculations.js';
import { goals } from '../data/goals.js';
import './PlanPage.scss';

export default function PlanPage({ customer, onCustomerChange }) {
  const [isEditing, setIsEditing] = useState(false);

  const monthlySurplus = calculateMonthlySurplus(customer);
  const netWorth = calculateNetWorth(customer);

  const isAllocationComplete = 
    goals.length > 0 &&
    goals.every(
      (goal) =>
        Number.isFinite(goal.monthlyAllocation) &&
        goal.monthlyAllocation >= 0
    );
  
  const totalAllocation = isAllocationComplete
    ? goals.reduce(
        (total, goal) => total + goal.monthlyAllocation,
        0
      )
    : null;

  function formatAmount(amount) {
    return `${amount.toLocaleString('ko-KR')}원`;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onCustomerChange({
      ...customer,
      monthlyNetIncome: Number(formData.get('income')),
      monthlyLivingExpenses: Number(formData.get('expenses')),
      monthlyLoanPayment: Number(formData.get('repayment')),
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
          {isEditing ? '취소' : '수정'}
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
          {monthlySurplus.toLocaleString('ko-KR')}
          <span>원</span>
        </p>

        <p className="plan-page__description">
          생활 지출과 대출상환액을 제외한 금액입니다.
          비상자금과 목표별 저축에 배분하기 전입니다.
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
            <dd className="amount">
              {formatAmount(customer.totalAssets)}
            </dd>
          </div>

          <div>
            <dt>학자금 대출</dt>
            <dd className="amount">
              {formatAmount(customer.totalDebt)}
            </dd>
          </div>

          <div className="plan-page__net-worth">
            <dt>순자산</dt>
            <dd className="amount">
              {formatAmount(netWorth)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="plan-page__goals">
        <h2>목표별 저축 계획</h2>

        <p className="plan-page__description">
          학자금 대출 상환은 위의 월 현금흐름에 반영되어 있습니다.
          아래 목표별 저축 계획은 설계안 확정 후 반영합니다.
        </p>

        <table className="plan-page__goal-table">
          <caption>팀 재무설계안의 목표금액과 저축 배분</caption>

          <thead>
            <tr>
              <th scope="col">목표</th>
              <th scope="col">준비할 금액</th>
              <th scope="col">남은 기간</th>
              <th scope="col">현재 모은 금액</th>
              <th scope="col">월 저축 배분</th>
            </tr>
          </thead>

          <tbody>
            {goals.map((goal) => (
              <tr key={goal.id}>
                <th scope="row">{goal.name}</th>

                <td className="amount">
                  {goal.targetAmount == null
                    ? '미정'
                    : formatAmount(goal.targetAmount)}
                </td>

                <td>
                  {goal.remainingMonths == null
                    ? '미정'
                    : `${goal.remainingMonths}개월`}
                </td>

                <td className="amount">
                  {goal.currentSavings == null
                    ? '미정'
                    : formatAmount(goal.currentSavings)}
                </td>

                <td className="amount">
                  {goal.monthlyAllocation == null
                    ? '미정'
                    : formatAmount(goal.monthlyAllocation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className='plan-page__description'>
          {totalAllocation === null ? (
            '월 저축 배분이 확정되면 잉여자금 범위 내에서 배분했는지 점검합니다.'
          ) : totalAllocation > monthlySurplus ? (
            <>
              월 저축 배분 합계는 {formatAmount(totalAllocation)}으로,
              월 잉여자금보다{' '}
              {formatAmount(totalAllocation - monthlySurplus)} 초과합니다.
            </>
          ) : (
            <>
              월 저축 배분 합계는 {formatAmount(totalAllocation)}이며,
              배분 후 남는 금액은{' '}
              {formatAmount(monthlySurplus - totalAllocation)}입니다.
            </>
          )}
        </p>
      </section>
    </section>
  )
}