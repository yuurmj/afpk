export async function requestPlanReview(data, signal) {
  const response = await fetch('/api/review-plan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data), signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || '검토 요청을 처리하지 못했습니다.');
  if (typeof result.review !== 'string' || !result.review.trim()) throw new Error('검토 결과가 비어 있습니다.');
  if (!Array.isArray(result.sections) || result.sections.length !== 6 || result.sections.some(section =>
    !section.id || !Array.isArray(section.evidence) || !Array.isArray(section.findings) || !section.advice)) {
    throw new Error('검토 결과 형식이 올바르지 않습니다. 다시 요청해 주세요.');
  }
  return result;
}
