export function calculateMonthlySurplus(customer) {
    return (
        customer.monthlyNetIncome -
        customer.monthlyLivingExpenses -
        customer.monthlyLoanPayment
    );
}

export function calculateNetWorth(customer) {
    return customer.totalAssets - customer.totalDebt;
}

export function caculateCashflowScenario(customer, incomeDcreaseRate, expenseIncreaseRate) {
    const reducedIncome = Math.round(
        customer.monthlyNetIncome * (1 - incomeDcreaseRate / 100)
    );
    
    const increasedExpenses = Math.round(
        customer.monthlyLivingExpenses + (customer.monthlyLivingExpenses * expenseIncreaseRate) / 100
    );

    const scenarioCustomer = {
        ...customer,
        monthlyNetIncome: reducedIncome,
        monthlyLivingExpenses: increasedExpenses,
    };

    return {
        reducedIncome,
        increasedExpenses,
        monthlySurplus: calculateMonthlySurplus(scenarioCustomer),
    };
}

export function calculateGoalShortfall(targetAmount, remainingMonths, monthlySurplus) {
    const monthlySavings = Math.max(monthlySurplus, 0);
    const projectedSavings = monthlySavings * remainingMonths;
    const shortfall = Math.max(targetAmount - projectedSavings, 0);

    return {
        monthlySavings,
        projectedSavings,
        shortfall,
        isAchievable: shortfall === 0,
    };
}

export function calculateTemporaryShockGoal({
    targetAmount,
    remainingMonths,
    shockMonths,
    originalMonthlySurplus,
    stressedMonthlySurplus,
    plannedMonthlySavings = null,
}) {
    const normalMonths = remainingMonths - shockMonths;

    const savingsLimit = plannedMonthlySavings ?? Infinity;

    const normalMonthlyContribution = Math.min(
        originalMonthlySurplus,
        savingsLimit
    );

    const stressedMonthlyContribution = Math.min(
        stressedMonthlySurplus,
        savingsLimit
    );

    const totalNetCashflow =
        normalMonthlyContribution * normalMonths +
        stressedMonthlyContribution * shockMonths;

    const projectedSavings = Math.max(totalNetCashflow, 0);

    const shortfall = Math.max(
        targetAmount - projectedSavings,
        0
    );

    const hasMonthlyDeficit =
        (shockMonths > 0 && stressedMonthlySurplus < 0) ||
        (normalMonths > 0 && originalMonthlySurplus < 0);

    const exceedsMonthlyCapacity =
        plannedMonthlySavings !== null &&
        (
        (shockMonths > 0 &&
            plannedMonthlySavings > Math.max(stressedMonthlySurplus, 0)) ||
        (normalMonths > 0 &&
            plannedMonthlySavings > Math.max(originalMonthlySurplus, 0))
        );

    return {
        normalMonths,
        shockMonths,
        totalNetCashflow,
        projectedSavings,
        shortfall,
        hasMonthlyDeficit,
        exceedsMonthlyCapacity,
    };
}

function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomNormal(random) {
  const u = 1 - random();
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function simulateGoalMonteCarlo({
  customer,
  targetAmount,
  remainingMonths,
  incomeVolatility = 0.05,   // 소득 연간 변동성 (표준편차 5%)
  expenseVolatility = 0.05,  // 지출 연간 변동성
  runs = 1000,
  seed = 2026,
}) {
  const random = createRandom(seed);
  const totals = [];

  for (let run = 0; run < runs; run++) {
    let total = 0;
    let incomeFactor = 1;
    let expenseFactor = 1;

    for (let month = 0; month < remainingMonths; month++) {
      if (month % 12 === 0) {
        incomeFactor = 1 + randomNormal(random) * incomeVolatility;
        expenseFactor = 1 + randomNormal(random) * expenseVolatility;
      }
      const surplus =
        customer.monthlyNetIncome * incomeFactor -
        customer.monthlyLivingExpenses * expenseFactor -
        customer.monthlyLoanPayment;
      total += Math.max(surplus, 0); // 기존 calculateGoalShortfall과 같은 기준
    }
    totals.push(total);
  }

  totals.sort((a, b) => a - b);
  const pick = (ratio) => Math.round(totals[Math.min(runs - 1, Math.floor(runs * ratio))]);
  const successCount = totals.filter((v) => v >= targetAmount).length;

  return {
    runs,
    incomeVolatility,
    expenseVolatility,
    successRate: successCount / runs,
    p10: pick(0.1),
    median: pick(0.5),
    p90: pick(0.9),
  };
}
// 보고서 설계안의 기간 구분: 1년차, 2년차, 3년차, 4~5년차(24개월)
export const PLAN_PERIOD_MONTHS = [12, 12, 12, 24];

// 5년 설계안 점검: 충격 조건에서 연차별 월 배분이 가용 재원 안에 들어가는지 계산합니다.
// - 배분표에 학자금 상환이 포함되어 있으므로 대출상환액은 다시 빼지 않습니다.
// - 부족액이 생기면 '결혼·주거 유동성 자금'(조건부 재배분 항목)을 먼저 줄여 충당한다고 보고,
//   그래도 남는 부족액을 따로 계산합니다.
export function calculatePlanStress({
  customer,
  allocationItems,
  expenseReduction,
  scenario,
  isaStockRatio,
  isaDropRate,
  periodMonths = PLAN_PERIOD_MONTHS,
}) {
  const income = Math.round(
    customer.monthlyNetIncome * (1 - scenario.incomeDecreaseRate / 100),
  );
  // 절감액은 생활지출을 넘을 수 없다(지출이 음수가 되는 것 방지).
  const appliedReduction = scenario.skipReduction
    ? 0
    : Math.min(expenseReduction, customer.monthlyLivingExpenses);
  const baseExpenses = customer.monthlyLivingExpenses - appliedReduction;
  const expenses = Math.round(
    baseExpenses * (1 + scenario.expenseIncreaseRate / 100),
  );
  const available = income - expenses;

  const liquidityItem = allocationItems.find((item) => item.id === 'liquidity');
  const isaItem = allocationItems.find((item) => item.id === 'isa');

  const yearly = periodMonths.map((months, index) => {
    const allocation = allocationItems.reduce(
      (total, item) => total + item.monthly[index],
      0,
    );
    const liquidity = liquidityItem ? liquidityItem.monthly[index] : 0;
    const gap = available - allocation;
    const uncovered = Math.max(-gap - liquidity, 0);
    return { months, allocation, gap, uncovered };
  });

  const cumulativeGap = yearly.reduce(
    (total, year) => total + year.gap * year.months,
    0,
  );
  const uncoveredTotal = yearly.reduce(
    (total, year) => total + year.uncovered * year.months,
    0,
  );

  const isaContribution = isaItem
    ? isaItem.monthly.reduce(
        (total, amount, index) => total + amount * periodMonths[index],
        0,
      )
    : 0;
  const isaLoss = scenario.isaCrash
    ? Math.round(isaContribution * isaStockRatio * isaDropRate)
    : 0;

  return { available, yearly, cumulativeGap, uncoveredTotal, isaLoss };
}
