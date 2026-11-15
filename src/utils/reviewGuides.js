const guides = {
  goal: {
    description: '5년 설계안 검토와 별도로, 직접 정한 목표금액에 도달할 수 있는지 추가로 확인할 수 있어요.',
    steps: '목표금액과 남은 기간을 입력해 보세요.',
    action: '목표 입력하기', fieldId: 'target-amount',
  },
  stress: {
    description: '소득 감소나 추가 자금이 필요한 상황에서, 목표 부족금액이 얼마나 달라지는지 살펴볼 수 있어요.',
    steps: '목표를 정한 뒤 충격이 지속되는 기간을 입력해 보세요.',
    action: '충격 기간 설정하기', fieldId: 'shock-months',
  },
  monteCarlo: {
    description: '소득과 지출이 달라지는 상황을 1,000번 계산해, 목표 달성 결과가 어떻게 달라지는지 살펴볼 수 있어요.',
    steps: '목표를 정한 뒤 ‘시뮬레이션 실행’을 눌러 보세요.',
    action: '시뮬레이션 시작하기', fieldId: 'run-monte-carlo',
  },
  adjustment: {
    description: '목표금액·기간·월 저축액을 바꾸면서, 현재 계획과 수정 계획의 결과를 비교할 수 있어요.',
    steps: '기존 목표를 정한 뒤 수정할 목표금액·기간·월 저축액을 입력해 보세요.',
    action: '수정 계획 입력하기', fieldId: 'adjusted-target',
  },
};

export function getReviewGuide(id, hasGoal) {
  const guide = guides[id] ?? guides.goal;
  if (!hasGoal && id !== 'goal') {
    return { ...guide, action: '목표 설정하고 시작하기', fieldId: 'target-amount' };
  }
  return { ...guide };
}
