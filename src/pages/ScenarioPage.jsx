import { useState } from 'react';
import { calculateMonthlySurplus, calculateIncomeScenario } from '../utils/calculations.js';
import './ScenarioPage.scss'


export default function ScenarioPage({ customer }) {
  const [decreaseRate, setDecreaseRate] = useState('10');
  
  const rate = Number(decreaseRate);
  const isValid =
    decreaseRate !== '' &&
    Number.isFinite(rate) &&
    rate >= 0 &&
    rate <= 100;

  const originalSurplus = calculateMonthlySurplus(customer);

  const scenario = isValid
    ? calculateIncomeScenario(customer, rate)
    : null;

  function formatAmount(amount) {
    return `${amount.toLocaleString('ko-KR')}원`;
  }

  return (
    <section className="scenario-page">
      <header className='scenario-page__header'>
        <h1>시나리오 비교</h1>
        <p>소득이 줄었을 때 매월 남는 금액을 확인합니다.</p>
      </header>

      <section className="scenario-page__settings">
        <h2>소득 감소</h2>

        <label htmlFor='income-decrease'>감소율 (%)</label>
        <input 
          id="income-decrease"  
          type='number'
          min="0"
          max="100"
          step="any"
          value={decreaseRate}
          onChange={(event) => 
            setDecreaseRate(event.target.value)
          }
          aria-describedby='income-decrease-help'
          aria-invalid={!isValid}
        />

        <p id="income-decrease-help">
          {isValid
            ? '생활지출과 대출상환액은 현재 금액을 유지합니다.'
            : '감소율을 0~100 사이로 입력해 주세요.'}
        </p>
      </section>

      <section className='scenario-page__results'>
        <h2>월 현금흐름 비교</h2>

        <table>
          <caption>
            현재 고객정보와 소득 감소 시나리오 비교 · 월 기준
          </caption>

          <thead>
            <tr>
              <th scope='col'>항목</th>
              <th scope='col'>기본</th>
              <th scope='col'>소득 감소 후</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <th scope='row'>실수령액</th>
              <td className='amount'>
                {formatAmount(customer.monthlyNetIncome)}
              </td>
              <td className='amount'>
                {scenario
                  ? formatAmount(scenario.reducedIncome)
                  : '—'}
              </td>
            </tr>

            <tr>
              <th scope='row'>생활 지출</th>
              <td className='amount'>
                {formatAmount(customer.monthlyLivingExpenses)}
              </td>
              <td className='amount'>
                {formatAmount(customer.monthlyLivingExpenses)}
              </td>
            </tr>

            <tr>
              <th scope='row'>대출상환액</th>
              <td className='amount'>
                {formatAmount(customer.monthlyLoanPayment)}
              </td>
              <td className='amount'>
                {formatAmount(customer.monthlyLoanPayment)}
              </td>
            </tr>

            <tr className="scenario-page__surplus">
              <th scope="row">잉여자금</th>
              <td className="amount">
                {formatAmount(originalSurplus)}
              </td>
              <td className="amount">
                {scenario
                  ? formatAmount(scenario.monthlySurplus)
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>

        {scenario && (
          <p className='scenario-page__message'>
            매월 남는 금액이 기본 상태 보다{' '}
            <strong>
              {formatAmount(
                originalSurplus - scenario.monthlySurplus
              )}
            </strong>{' '}
            줄어듭니다.
            {scenario.monthlySurplus < 0 &&
              ' 소득보다 지출과 상환액이 많아 월 적자가 발생합니다.'}
          </p>
        )}
      </section>
    </section>
  )
}