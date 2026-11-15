import { allocationPeriods, expenseReduction } from '../data/allocationPlan.js';
import { PLAN_PERIOD_MONTHS } from './calculations.js';
import { ISA_STOCK_RATIO, ISA_DROP_RATE } from '../data/planStressScenarios.js';

export function createPlanReviewPayload(customer, allocationItems, reviewData) {
  return {
    customer, allocationPeriods, allocationItems,
    allocationExpenseReduction: expenseReduction.monthly,
    // 결과 금액을 신뢰하지 않고 서버가 현재 입력과 이 가정으로 다시 계산합니다.
    planStress: {
      periodMonths: PLAN_PERIOD_MONTHS,
      isaStockRatio: ISA_STOCK_RATIO,
      isaDropRate: ISA_DROP_RATE,
    },
    scenario: reviewData?.scenario ?? null,
    monteCarlo: reviewData?.scenario?.monteCarlo ?? null,
    adjustmentExceedsCapacity: reviewData?.adjustmentExceedsCapacity ?? false,
  };
}

