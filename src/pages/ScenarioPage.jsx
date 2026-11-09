import { useState } from 'react';
import { calculateMonthlySurplus, caculateCashflowScenario, calculateGoalShortfall } from '../utils/calculations.js';
import './ScenarioPage.scss'


export default function ScenarioPage({ customer }) {
  const [decreaseRate, setDecreaseRate] = useState('10');
  const [expenseIncreaseRate, setExpenseIncreaseRate] = useState('0');
  const [targetAmount, setTargetAmount] = useState('');
  const [remainingMonths, setRemainingMonths] = useState('');

  const incomeRate = Number(decreaseRate);
  const expenseRate = Number(expenseIncreaseRate);

  const isIncomeValid =
    decreaseRate !== '' &&
    Number.isFinite(incomeRate) &&
    incomeRate >= 0 &&
    incomeRate <= 100;
  
  const isExpenseValid = 
    expenseIncreaseRate !== '' &&
    Number.isFinite(expenseRate) &&
    expenseRate >= 0;

  const isValid = isIncomeValid && isExpenseValid;

  const originalSurplus = calculateMonthlySurplus(customer);

  const scenario = isValid
    ? caculateCashflowScenario(customer, incomeRate, expenseRate)
    : null;

  const goalAmount = Number(targetAmount);
  const goalMonths = Number(remainingMonths);

  const isGoalValid = 
    targetAmount.trim() !== '' &&
    remainingMonths.trim() !== '' &&
    Number.isFinite(goalAmount) &&
    goalAmount > 0 &&
    Number.isInteger(goalMonths) &&
    goalMonths > 0;

  const originalGoal = isGoalValid
    ? calculateGoalShortfall(
        goalAmount,
        goalMonths,
        originalSurplus
      )
    : null;
  
  const scenarioGoal = isGoalValid && scenario
    ? calculateGoalShortfall(
        goalAmount,
        goalMonths,
        scenario.monthlySurplus
      )
    : null;

  function formatAmount(amount) {
    return `${amount.toLocaleString('ko-KR')}원`;
  }

  return (
    <section className="scenario-page">
      <header className='scenario-page__header'>
        <h1>시나리오 비교</h1>
        <p>소득과 생활 지출이 달라졌을 때 월 현금흐름을 비교합니다.</p>
      </header>

      <section className="scenario-page__settings">
        <h2>변경 조건</h2>

        <div className="scenario-page__inputs">
            <div>
                <label htmlFor="income-decrease">
                    실수령액 감소율 (%)
                </label>
                <input
                    id="income-decrease"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={decreaseRate}
                    onChange={(event) =>
                        setDecreaseRate(event.target.value)
                    }
                    aria-invalid={!isIncomeValid}
                    aria-describedby="scenario-help"
                />
            </div>

            <div>
                <label htmlFor="expense-increase">
                    생활지출 증가율 (%)
                </label>
                <input
                    id="expense-increase"
                    type="number"
                    min="0"
                    step="any"
                    value={expenseIncreaseRate}
                    onChange={(event) =>
                        setExpenseIncreaseRate(event.target.value)
                    }
                    aria-invalid={!isExpenseValid}
                    aria-describedby="scenario-help"
                />
            </div>
        </div>

        <p id="scenario-help">
            {isValid
                ? '소득과 생활지출의 변화를 동시에 적용합니다. 대출상환액은 현재 금액을 유지합니다.'
                : '소득 감소율은 0~100%, 생활지출 증가율은 0% 이상으로 입력해 주세요.'}
        </p>
      </section>

      <section className='scenario-page__results'>
        <h2>월 현금흐름 비교</h2>

        <table>
          <caption>
            현재 고객정보와 변경 조건 비교 · 월 기준
          </caption>

          <thead>
            <tr>
              <th scope='col'>항목</th>
              <th scope='col'>기본</th>
              <th scope='col'>조건 변경 후</th>
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
              <th scope='row'>생활지출</th>
              <td className='amount'>
                {formatAmount(customer.monthlyLivingExpenses)}
              </td>
              <td className="amount">
                {scenario
                    ? formatAmount(scenario.increasedExpenses)
                    : '—'}
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
          <p className="scenario-page__message">
            {originalSurplus === scenario.monthlySurplus ? (
                '기본 상태와 동일합니다.'
            ) : (
                <>
                    매월 남는 금액이 기본 상태보다{' '}
                    <strong>
                        {formatAmount(originalSurplus - scenario.monthlySurplus)}
                    </strong>{' '}
                    줄어듭니다.
                </>
            )}
          </p>
        )}
      </section>

      <section className='scenario-page__goal'>
        <h2>목표자금 점검</h2>
        
        <div className='scenario-page__inputs'>
          <div>
            <label htmlFor='target-amount'>
              목표금액 (원)
            </label>
            <input
              id="target-amount"
              type="number"
              min="1"
              step="1"
              value={targetAmount}
              onChange={(event) =>
                setTargetAmount(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="remaining-months">
              남은 기간 (개월)
            </label>
            <input
              id="remaining-months"
              type="number"
              min="1"
              value={remainingMonths}
              onChange={(event) =>
                setRemainingMonths(event.target.value)
              }
            />
          </div>
        </div>

        <p id="goal-help">
          현재 모아둔 목표자금과 이자는 제외하고, 월 잉여자금
          전액을 하나의 목표에 저축한다고 가정합니다.
          월 잉여자금이 적자이면 저축액은 0원으로 계산합니다.
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
                <th scope='row'>월 저축 가능액</th>
                <td className='amount'>
                  {formatAmount(originalGoal.monthlySavings)}
                </td>
                <td className="amount">
                  {scenarioGoal
                    ? formatAmount(scenarioGoal.monthlySavings)
                    : '—'}
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
                    : '—'}
                </td>
              </tr>

              <tr className="scenario-page__surplus">
                <th scope="row">목표 대비 부족금액</th>
                <td className="amount">
                  {formatAmount(originalGoal.shortfall)}
                </td>
                <td className="amount">
                  {scenarioGoal
                    ? formatAmount(scenarioGoal.shortfall)
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}