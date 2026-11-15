import { allocationItems } from './allocationPlan.js';

// 금액 단위: 원
// extraCost: 충격 때문에 목표까지 추가로 더 모아야 하는 금액 (주택 목표 기준)
// 조건은 발생 가능성이 낮은 '최악의 상황'을 가정한 점검용입니다.

// ISA 평가손실: 코로나19 당시 코스피 고점 대비 약 35% 하락(재무설계 담당 제시)을
// ISA 주식 비중 60%에 적용합니다(채권 변동은 제외).
// 납입액은 배분표의 1~5년차 ISA 월 납입액 합계이며, 주택 구입 시점 확정 후 수정합니다.
const ISA_STOCK_RATIO = 0.6;
const ISA_CRASH_RATE = 0.35;
const isaMonthly = allocationItems.find((item) => item.id === 'isa').monthly;
// 기간별 개월 수: 1년차, 2년차, 3년차, 4~5년차(24개월)
const PERIOD_MONTHS = [12, 12, 12, 24];
const isaContribution = isaMonthly.reduce(
  (total, amount, index) => total + amount * PERIOD_MONTHS[index],
  0,
);
const isaLoss = Math.round(isaContribution * ISA_STOCK_RATIO * ISA_CRASH_RATE);

const PARENT_SUPPORT = 50_000_000;
const HOUSE_PRICE_RISE = 90_000_000;

export const stressScenarios = [
  {
    id: 'baseline',
    name: '기본 조건',
    description: '보고서 기본 가정(소득 정체)',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    extraCost: 0,
  },
  {
    id: 'parent-support-loss',
    name: '부모 지원 취소',
    description: '주택 마련 시 부모님 5,000만 원 지원이 없어짐',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    extraCost: PARENT_SUPPORT,
  },
  {
    id: 'house-price-up',
    name: '주택가격 10% 상승',
    description: '9억 원 → 9.9억 원',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    extraCost: HOUSE_PRICE_RISE,
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
    id: 'income-expense',
    name: '소득 감소·지출 증가',
    description: '소득 10% 감소, 생활지출 10% 증가',
    incomeDecreaseRate: 10,
    expenseIncreaseRate: 10,
    extraCost: 0,
  },
  {
    id: 'combined',
    name: '복합 충격 (최악 가정)',
    description:
      '부모 지원 취소 + 주택가격 10% 상승 + ISA 평가손실 + 소득 10% 감소',
    incomeDecreaseRate: 10,
    expenseIncreaseRate: 0,
    extraCost: PARENT_SUPPORT + HOUSE_PRICE_RISE + isaLoss,
  },
];
