// 금액 단위: 원
// extraCost: 충격 때문에 목표까지 추가로 더 모아야 하는 금액 (주택 목표 기준)
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
    extraCost: 50_000_000,
  },
  {
    id: 'house-price-up',
    name: '주택가격 10% 상승',
    description: '9억 원 → 9.9억 원',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    extraCost: 90_000_000,
  },
  {
    id: 'savings-rate-low',
    name: '적금 우대금리 미충족',
    description: '청년미래적금 금리 8% → 5%, 만기금 약 83만 원 감소',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    extraCost: 830_000,
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
    name: '복합 충격',
    description: '부모 지원 취소 + 주택가격 10% 상승 + 소득 10% 감소',
    incomeDecreaseRate: 10,
    expenseIncreaseRate: 0,
    extraCost: 140_000_000,
  },
];