export async function requestPlanChat(data, signal) {
  const response = await fetch('/api/review-plan/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || '대화 요청을 처리하지 못했습니다. 다시 시도해 주세요.');
  if (typeof result.answer !== 'string' || !result.answer.trim()) throw new Error('AI 답변이 비어 있습니다. 다시 질문해 주세요.');
  return result.answer;
}
