// 금액 단위: 원 (월 기준)
// 출처: 팀 보고서 4단계 '투자 재원 및 연도별 자금 배분안' (원문은 만원 단위, 소수점 셋째 자리까지)
// - 월 가용 재원 166.376만 원 = 월 실수령액 301.995만 원 - (생활지출 148.619만 원 - 식비 절감 13만 원)
// - 학자금 상환·비상자금 적립은 가용 재원에서 먼저 빼는 지출(fixedOutflow)이며, 1년차의 남는 재원
//   108.556만 원을 두 항목에 배분합니다(비상자금 1년차 월 41.25만 원 = 1년차 말 3개월분 약 495만 원).
// - 결혼·주거 유동성 자금은 다른 항목을 배분하고 남는 금액이라 모든 연차의 배분 합계가 가용 재원과 같습니다.

export const allocationPeriods = ['1년차', '2년차', '3년차', '4~5년차'];

export const allocationItems = [
    { id: 'student-loan', name: '학자금 상환', fixedOutflow: true, monthly: [673_060, 0, 0, 0] },
    { id: 'emergency', name: '비상자금 적립', fixedOutflow: true, monthly: [412_500, 265_340, 0, 0] },
    { id: 'youth-savings', name: '청년미래적금', monthly: [500_000, 500_000, 500_000, 0] },
    { id: 'subscription', name: '청년주택드림 청약', monthly: [78_200, 200_000, 200_000, 200_000] },
    { id: 'isa', name: 'ISA(서민형)', monthly: [0, 698_420, 498_420, 498_420] },
    { id: 'irp', name: 'IRP', monthly: [0, 0, 200_000, 200_000] },
    { id: 'liquidity', name: '결혼·주거 유동성 자금', monthly: [0, 0, 265_340, 765_340] },
];

// 설계안에 포함된 지출 절감 (재무설계 담당 확인: 식비 월 13만 원 절감)
// 배분 가능 재원 = 월 실수령액 - (생활지출 - 절감액)
export const expenseReduction = {
    label: '식비',
    monthly: 130_000,
};
