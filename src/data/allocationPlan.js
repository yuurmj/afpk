// 금액 단위: 원 (월 기준)
// 출처: 팀 보고서 '월 가처분 재원 및 계좌별 자금 배분 플랜' (원문은 만원 단위)
// 보고서 표의 -67, -41, -26처럼 음수로 적힌 학자금 상환·비상자금 적립은
// 가용 재원에서 먼저 빼는 지출이며(재무설계 담당 확인), 보고서의 합계 행은
// 이 둘을 뺀 저축·투자 가능액입니다. 여기서는 모두 양수 배분액으로 기재하고
// fixedOutflow: true 로 표시합니다.

export const allocationPeriods = ['1년차', '2년차', '3년차', '4~5년차'];

export const allocationItems = [
    { id: 'student-loan', name: '학자금 상환', fixedOutflow: true, monthly: [670_000, 0, 0, 0] },
    { id: 'emergency', name: '비상자금 적립', fixedOutflow: true, monthly: [410_000, 260_000, 0, 0] },
    { id: 'youth-savings', name: '청년미래적금', monthly: [500_000, 500_000, 500_000, 0] },
    { id: 'subscription', name: '청년주택드림 청약', monthly: [70_000, 200_000, 200_000, 200_000] },
    { id: 'isa', name: 'ISA(서민형)', monthly: [0, 690_000, 490_000, 490_000] },
    { id: 'irp', name: 'IRP', monthly: [0, 0, 200_000, 200_000] },
    { id: 'liquidity', name: '결혼·주거 유동성 자금', monthly: [0, 0, 260_000, 760_000] },
];

// 설계안에 포함된 지출 절감 (재무설계 담당 확인: 식비 월 13만 원 절감)
// 배분 가능 재원 = 월 실수령액 - (생활지출 - 절감액)
export const expenseReduction = {
    label: '식비',
    monthly: 130_000,
};
