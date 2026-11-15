// 금액 단위: 원 (월 기준)
// 출처: 팀 보고서 '월 가처분 재원 및 계좌별 자금 배분 플랜' (원문은 만원 단위)
// 보고서 표의 -67, -41, -26처럼 음수로 적힌 항목은 투자 합계에서 제외된
// 학자금 상환·비상자금 적립이므로, 여기서는 모두 양수 배분액으로 기재합니다.
// 보고서 확정 전 값이므로 재무설계 담당 확인 후 수정하세요.

export const allocationPeriods = ['1년차', '2년차', '3년차', '4~5년차'];

export const allocationItems = [
    { id: 'student-loan', name: '학자금 상환', monthly: [670_000, 0, 0, 0] },
    { id: 'emergency', name: '비상자금 적립', monthly: [410_000, 260_000, 0, 0] },
    { id: 'youth-savings', name: '청년미래적금', monthly: [500_000, 500_000, 500_000, 0] },
    { id: 'subscription', name: '청년주택드림 청약', monthly: [70_000, 200_000, 200_000, 200_000] },
    { id: 'isa', name: 'ISA(서민형)', monthly: [0, 690_000, 490_000, 490_000] },
    { id: 'irp', name: 'IRP', monthly: [0, 0, 200_000, 200_000] },
    { id: 'liquidity', name: '결혼·주거 유동성 자금', monthly: [0, 0, 260_000, 760_000] },
];
