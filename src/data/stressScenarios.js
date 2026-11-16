import { ISA_STOCK_RATIO, ISA_DROP_RATE } from './planStressScenarios.js';
import { PLAN_PERIOD_MONTHS } from '../utils/calculations.js';

// 금액 단위: 원
// 목표금액·기간을 직접 입력해 점검하는 시나리오 비교 화면용 충격 조건입니다.
// extraCost: 충격 때문에 목표까지 추가로 더 모아야 하는 금액
// 조건은 발생 가능성이 낮은 '최악의 상황'을 가정한 점검용입니다.

// ISA 평가손실: 코로나19 당시 코스피 고점 대비 약 35% 하락을 ISA 주식 비중 60%에
// 적용합니다. 납입액은 배분표의 1~5년차 ISA 월 납입액 합계입니다.
export function createStressScenarios(allocationItems) {
const isaMonthly = allocationItems.find((item) => item.id === 'isa')?.monthly ?? [];
const isaContribution = isaMonthly.reduce(
  (total, amount, index) => total + amount * PLAN_PERIOD_MONTHS[index],
  0,
);
const isaLoss = Math.round(isaContribution * ISA_STOCK_RATIO * ISA_DROP_RATE);

return [
  {
    id: 'baseline',
    name: '기본 조건',
    description: '보고서 기본 가정(소득 정체)',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    extraCost: 0,
  },
  {
    id: 'income-down',
    name: '소득 감소',
    description: '소득 10% 감소',
    incomeDecreaseRate: 10,
    expenseIncreaseRate: 0,
    extraCost: 0,
  },
  {
    id: 'expense-up',
    name: '생활지출 증가',
    description: '생활지출 10% 증가',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 10,
    extraCost: 0,
  },
  {
    id: 'isa-crash',
    name: 'ISA 평가손실',
    description: '코로나19급 하락(코스피 고점 대비 -35%)을 ISA 주식 60%에 적용',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    extraCost: isaLoss,
  },
  {
    id: 'combined',
    name: '복합 충격 (최악 가정)',
    description: '소득 10% 감소 + 생활지출 10% 증가 + ISA 평가손실',
    incomeDecreaseRate: 10,
    expenseIncreaseRate: 10,
    extraCost: isaLoss,
  },
];
}
