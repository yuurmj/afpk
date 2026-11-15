import { useEffect, useRef, useState } from "react";
import { allocationPeriods } from "../data/allocationPlan.js";
import { requestPlanReview } from "../services/reviewApi.js";
import ReviewChat from "../components/ReviewChat.jsx";
import { calculateMonthlySurplus } from "../utils/calculations.js";
import "./ReviewPage.scss";

export default function ReviewPage({ customer, reviewData, allocationItems }) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const active = useRef(null);
  const [view, setView] = useState("chat");
  const tabButtons = useRef([]);
  const payload = JSON.stringify({
    customer, allocationPeriods, allocationItems,
    scenario: reviewData?.scenario ?? null,
    monteCarlo: reviewData?.scenario?.monteCarlo ?? null,
    adjustmentExceedsCapacity: reviewData?.adjustmentExceedsCapacity ?? false,
  });
  useEffect(() => {
    active.current?.abort(); active.current = null;
    setReview(null); setError(""); setLoading(false);
    return () => active.current?.abort();
  }, [payload]);
  async function handleReview() {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    setView("review");
    setLoading(true); setError(""); setReview(null);
    try {
      const result = await requestPlanReview(JSON.parse(payload), controller.signal);
      if (active.current === controller) setReview(result);
    } catch (e) {
      if (active.current === controller && e.name !== 'AbortError') setError(e.message);
    } finally {
      if (active.current === controller) { active.current = null; setLoading(false); }
    }
  }
  const sources = [
    { name: '고객 재무정보', ready: true, detail: '소득·지출·자산·부채' },
    { name: '연차별 배분', ready: true, detail: '항목별 월 배분 계획' },
    { name: '목표 · 시나리오', ready: !!reviewData?.scenario, detail: '시나리오 비교에서 목표와 기간 입력' },
    { name: '스트레스 테스트', ready: !!reviewData?.scenario?.stressTest, detail: '충격 지속 기간 입력' },
    { name: '몬테카를로', ready: !!reviewData?.scenario?.monteCarlo, detail: '시나리오 비교에서 시뮬레이션 실행' },
    { name: '수정 계획', ready: !!reviewData?.scenario?.adjustment || !!reviewData?.adjustmentExceedsCapacity,
      detail: reviewData?.adjustmentExceedsCapacity ? '월 저축 가능액 초과 · 점검 필요' : '수정 목표·기간·저축액 입력' },
  ];
  const readyCount = sources.filter(source => source.ready).length;
  const attentionCount = review?.sections.filter(section => section.status === 'attention').length ?? 0;
  const missingCount = review?.sections.filter(section => section.status === 'missing').length ?? 0;
  const firstAttention = review?.sections.findIndex(section => section.status === 'attention') ?? -1;
  const money = value => `${value.toLocaleString('ko-KR')}원`;
  function changeTabByKey(event, index) {
    let next;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = 1 - index;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault(); setView(next === 0 ? 'chat' : 'review'); tabButtons.current[next]?.focus();
  }
  return <section className="review-page">
    <header className="review-page__header">
      <div><p className="review-page__eyebrow">재무계획 점검</p><h1>AI 답변 검토</h1>
        <p className="review-page__intro">계획을 점검하고, 궁금한 점은 대화로 이어가세요.</p></div>
      <button type="button" className="review-page__button" onClick={handleReview} disabled={loading}>
        <span aria-hidden="true">{loading ? '◌' : '↗'}</span> {loading ? '전체 계획 검토 중…' : review ? '전체 계획 다시 검토' : '전체 계획 검토하기'}
      </button>
    </header>

    <section className="review-page__context" aria-labelledby="review-customer-heading">
      <div className="review-page__customer-line"><div><span className="review-page__avatar" aria-hidden="true">고객</span>
        <div><h2 id="review-customer-heading">{customer.age}세 · {customer.occupation}</h2><p>현재 입력한 고객과 계획으로 검토합니다</p></div></div>
        <span className="review-page__source-count">검토 자료 <strong>{readyCount} / 6</strong></span></div>
      <dl className="review-page__numbers">
        <div><dt>월 실수령액</dt><dd>{money(customer.monthlyNetIncome)}</dd></div>
        <div><dt>월 잉여자금</dt><dd>{money(calculateMonthlySurplus(customer))}</dd></div>
        <div><dt>총자산</dt><dd>{money(customer.totalAssets)}</dd></div>
        <div><dt>총부채</dt><dd>{money(customer.totalDebt)}</dd></div>
      </dl>
      <details className="review-page__sources"><summary>검토에 사용되는 자료 확인 <span aria-hidden="true">⌄</span></summary>
        <ul>{sources.map(source => <li key={source.name}><div><strong>{source.name}</strong><p>{source.detail}</p></div>
          <span className={`review-page__source-state${source.ready ? ' is-ready' : ''}`}>{source.ready ? '포함' : '미입력'}</span></li>)}</ul>
        <p className="review-page__source-help">고객정보와 배분은 ‘재무계획’, 목표와 시뮬레이션은 ‘시나리오 비교’에서 수정하세요. 입력값이 바뀌면 이전 검토와 대화가 초기화됩니다.</p>
      </details>
    </section>

    <div className="review-page__tabs" role="tablist" aria-label="AI 검토 화면 선택">
      {[['chat', 'AI와 대화'], ['review', '전체 검토 결과']].map(([id, label], index) => <button key={id}
        ref={node => { tabButtons.current[index] = node; }} id={`ai-tab-${id}`} type="button" role="tab"
        aria-controls={`ai-panel-${id}`} aria-selected={view === id} tabIndex={view === id ? 0 : -1}
        onClick={() => setView(id)} onKeyDown={event => changeTabByKey(event, index)}>
        {label}{id === 'review' && review && <span className="review-page__tab-dot" aria-label="검토 결과 있음" />}
      </button>)}
    </div>
    <div id="ai-panel-chat" role="tabpanel" aria-labelledby="ai-tab-chat" hidden={view !== 'chat'}>
      <ReviewChat planJson={payload} reviewText={review?.review ?? ''} reviewLoading={loading} />
    </div>
    <div id="ai-panel-review" role="tabpanel" aria-labelledby="ai-tab-review" hidden={view !== 'review'}>
      <div aria-live="polite" aria-busy={loading}>
        {loading && <div className="review-page__empty" role="status"><span className="review-page__empty-icon" aria-hidden="true">◌</span>
          <h2>계획을 차근차근 살펴보고 있어요</h2><p>입력한 자료와 계산 결과를 바탕으로 점검할 내용을 정리합니다.</p>
          <div className="review-page__loading-line" /></div>}
        {error && <div role="alert" className="review-page__error"><strong>검토를 완료하지 못했어요</strong><p>{error}</p>
          <button type="button" onClick={handleReview}>다시 시도</button></div>}
        {!loading && !error && !review && <div className="review-page__empty"><span className="review-page__empty-icon" aria-hidden="true">✓</span>
          <h2>전체 계획을 한 번에 점검해 보세요</h2><p>현금흐름부터 수정 계획까지, 확인된 수치와 AI의 검토 의견을 구분해 보여드려요.</p>
          <button type="button" className="review-page__button" onClick={handleReview}>전체 계획 검토하기</button></div>}
        {review && <section className="review-page__result" aria-labelledby="review-result-title">
          <header className="review-page__result-header"><div><h2 id="review-result-title">재무계획 검토 결과</h2>
            <p>항목을 펼쳐 근거와 조정할 사항을 확인하세요.</p></div>
            <div className="review-page__result-counts"><span>점검 필요 <strong>{attentionCount}</strong></span><span>자료 없음 <strong>{missingCount}</strong></span></div></header>
          <div className="review-page__cards">{review.sections.map((section, index) => <details className="review-page__card" key={section.id}
            open={index === (firstAttention >= 0 ? firstAttention : 0)}>
            <summary><span className="review-page__card-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="review-page__card-label"><strong>{section.title}</strong><span>{section.findings[0]}</span></span>
              <span className={`review-page__badge review-page__badge--${section.status}`}>
                {{attention:'점검 필요', checked:'계산 확인', missing:'자료 없음'}[section.status] ?? '확인 필요'}</span><span className="review-page__chevron" aria-hidden="true">⌄</span></summary>
            <div className="review-page__card-body">
              <div className="review-page__facts"><h3>계산으로 확인한 사항</h3><ul>{section.findings.map((finding, i) => <li key={i}>{finding}</li>)}</ul>
                <div className="review-page__evidence"><h3>근거 수치 · 자료</h3><ul>{section.evidence.map((fact, i) => <li key={i}>{fact}</li>)}</ul></div></div>
              <div className="review-page__advice"><span className="review-page__ai-label">AI 검토 의견</span><h3>추가로 확인할 점</h3><p>{section.advice.problem}</p>
                <h3>확인하거나 조정할 사항</h3><p>{section.advice.action}</p></div>
            </div>
          </details>)}</div>
          <div className="review-page__continue"><div><strong>검토 결과에서 궁금한 부분이 있나요?</strong><p>현재 결과를 바탕으로 AI에게 이어서 물어보세요.</p></div>
            <button type="button" onClick={() => { setView('chat'); tabButtons.current[0]?.focus(); }}>AI와 대화하기 <span aria-hidden="true">→</span></button></div>
          <p className="review-page__notice">계산 확인은 계획 전체의 안전성을 뜻하지 않습니다. 상품 조건·만기·유동성은 추가 확인이 필요합니다.</p>
        </section>}
      </div>
    </div>
  </section>;
}
