// 금액 단위: 원, 기간 단위: 개월
// null은 팀 설계안 확정 전인 항목입니다.

export const goals = [
    {
        id: 'wedding',
        name: '결혼자금',
        targetAmount: null,       // 고객이 직접 준비할 목표금액
        remainingMonths: null,    // 목표까지 남은 기간
        currentSavings: null,     // 현재 해당 목표에 모아둔 금액
        monthlyAllocation: null,  // 해당 목표에 배정한 월 저축액
    },
    {
        id: 'housing',
        name: '주택자금',
        targetAmount: null,
        remainingMonths: null,
        currentSavings: null,
        monthlyAllocation: null,
    },
];