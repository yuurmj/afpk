// 보고서 5년 설계안(1~5년차 월 저축 배분)을 점검하는 충격 조건입니다.
// 발생 가능성이 낮은 '최악의 상황'을 가정한 점검용이며 예측이 아닙니다.
// 모든 충격은 5년 내내 지속된다고 가정합니다.

// ISA 평가손실: 코로나19 당시 코스피 고점 대비 약 35% 하락(재무설계 담당 제시)을
// ISA 주식 비중 60%에 적용합니다(채권 변동은 제외).
export const ISA_STOCK_RATIO = 0.6;
export const ISA_DROP_RATE = 0.35;

export const planStressScenarios = [
  {
    id: 'baseline',
    name: '설계안 그대로',
    description: '식비 절감을 지키고 소득·지출이 현재 수준 유지',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    skipReduction: false,
    isaCrash: false,
  },
  {
    id: 'reduction-fail',
    name: '식비 절감 미이행',
    description: '설계안의 식비 절감을 지키지 못함',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    skipReduction: true,
    isaCrash: false,
  },
  {
    id: 'income-down',
    name: '소득 10% 감소',
    description: '실수령액 10% 감소 (승진·상여 없이 소득이 줄어듦)',
    incomeDecreaseRate: 10,
    expenseIncreaseRate: 0,
    skipReduction: false,
    isaCrash: false,
  },
  {
    id: 'expense-up',
    name: '생활지출 10% 증가',
    description: '물가 상승 등으로 생활지출 10% 증가',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 10,
    skipReduction: false,
    isaCrash: false,
  },
  {
    id: 'isa-crash',
    name: 'ISA 평가손실',
    description: '코로나19급 하락(코스피 고점 대비 -35%)을 ISA 주식 60%에 적용',
    incomeDecreaseRate: 0,
    expenseIncreaseRate: 0,
    skipReduction: false,
    isaCrash: true,
  },
  {
    id: 'worst',
    name: '복합 충격 (최악 가정)',
    description: '소득 10% 감소 + 생활지출 10% 증가 + ISA 평가손실',
    incomeDecreaseRate: 10,
    expenseIncreaseRate: 10,
    skipReduction: false,
    isaCrash: true,
  },
];
