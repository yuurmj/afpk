// 개발용 예시 조건입니다.
// 최종 보고서에는 팀이 검토한 조건과 선정 근거를 반영합니다.

export const stressScenarios = [
    {
        id: 'baseline',
        name: '기본 조건',
        incomeDecreaseRate: 0,
        expenseIncreaseRate: 0,
    },
    {
        id: 'income',
        name: '소득 감소',
        incomeDecreaseRate: 10,
        expenseIncreaseRate:0,
    },
    {
        id: 'expenses',
        name: '생활지출 증가',
        incomeDecreaseRate: 0,
        expenseIncreaseRate: 10,
    },
    {
        id: 'combined',
        name: '복합 충격',
        incomeDecreaseRate: 10,
        expenseIncreaseRate: 10,
    },
    {
        id: 'combined-larger',
        name: '더 큰 복합 충격',
        incomeDecreaseRate: 20,
        expenseIncreaseRate: 15,
    },
]