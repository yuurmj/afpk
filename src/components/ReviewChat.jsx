import { useEffect, useRef, useState } from 'react';
import { requestPlanChat } from '../services/chatApi.js';
import './ReviewChat.scss';

const suggestions = ['이 계획에서 가장 먼저 확인할 부분은 뭐야?', '예산 초과와 목표 부족금액은 어떻게 달라?', '검토하려면 어떤 정보가 더 필요해?'];

export default function ReviewChat({ planJson, reviewText, reviewLoading }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(null);
  const end = useRef(null);
  const input = useRef(null);
  const limitReached = messages.length >= 12;

  function reset() {
    active.current?.abort(); active.current = null;
    setMessages([]); setQuestion(''); setLoading(false); setError('');
  }
  useEffect(() => { reset(); return () => active.current?.abort(); }, [planJson, reviewText]);
  useEffect(() => {
    if (messages.length && end.current?.getClientRects().length) end.current.scrollIntoView({ block: 'nearest' });
  }, [messages, loading]);

  async function send(text) {
    const value = text.trim();
    if (!value || value.length > 2000 || active.current || limitReached || reviewLoading) return;
    const controller = new AbortController(); active.current = controller;
    const history = [...messages, { role: 'user', text: value }];
    setMessages(history); setQuestion(''); setLoading(true); setError('');
    try {
      const answer = await requestPlanChat({ plan: JSON.parse(planJson), reviewText, messages: history }, controller.signal);
      if (active.current === controller) setMessages([...history, { role: 'assistant', text: answer }]);
    } catch (e) {
      if (active.current === controller && e.name !== 'AbortError') {
        setMessages(messages); setQuestion(value); setError(e.message);
      }
    } finally {
      if (active.current === controller) { active.current = null; setLoading(false); }
    }
  }
  return <section className="review-chat" aria-labelledby="review-chat-title">
    <header className="review-chat__header"><div className="review-chat__identity"><span className="review-chat__avatar" aria-hidden="true">AI</span>
      <div><h2 id="review-chat-title">재무계획 검토 도우미</h2><p><span aria-hidden="true" />현재 입력한 계획을 바탕으로 답변해요</p></div></div>
      <button className="review-chat__reset" type="button" onClick={reset} disabled={!messages.length && !question && !loading}>
        <span aria-hidden="true">↺</span> 새 대화</button>
    </header>
    <div className="review-chat__messages" role="log" aria-label="재무계획 대화" aria-live="polite" aria-busy={loading}>
      {!messages.length && <div className="review-chat__empty"><span className="review-chat__empty-mark" aria-hidden="true">↗</span>
        <h3>재무계획, 함께 짚어볼까요?</h3><p>검토 결과가 이해되지 않거나 더 확인하고 싶은 부분을 물어보세요.</p>
        <span className="review-chat__prompt-label">이런 질문으로 시작해 보세요</span>
        <div className="review-chat__suggestions">{suggestions.map(text => <button type="button" key={text}
          disabled={loading || reviewLoading || limitReached} onClick={() => { setQuestion(text); input.current?.focus(); }}>
          {text}<span aria-hidden="true">↗</span></button>)}</div>
      </div>}
      {messages.map((message, index) => <article className={`review-chat__message review-chat__message--${message.role}`} key={index}>
        <h3>{message.role === 'user' ? '나' : 'AI 검토 도우미'}</h3><p>{message.text}</p>
      </article>)}
      {loading && <div className="review-chat__typing" role="status"><span aria-hidden="true">● ● ●</span> 현재 계획과 대화를 확인하고 있어요</div>}
      <div ref={end} />
    </div>
    {error && <p className="review-chat__error" role="alert">{error}</p>}
    {limitReached && <p className="review-chat__limit">이번 대화의 질문을 모두 사용했어요. ‘새 대화’로 이어서 시작할 수 있어요.</p>}
    <form className="review-chat__form" onSubmit={event => { event.preventDefault(); send(question); }}>
      <label htmlFor="plan-chat-question">재무계획에 대해 질문하기</label>
      <div className="review-chat__composer"><textarea ref={input} id="plan-chat-question" value={question} onChange={event => setQuestion(event.target.value)}
        maxLength={2000} rows={2} disabled={loading || reviewLoading || limitReached}
        placeholder="이 계획에서 가장 먼저 확인할 부분은?"
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(question); } }} />
        <button type="submit" aria-label={loading ? 'AI 답변 작성 중' : '질문 보내기'}
          disabled={!question.trim() || loading || reviewLoading || limitReached}><span aria-hidden="true">{loading ? '◌' : '↑'}</span></button>
      </div>
      <div className="review-chat__form-meta"><span>Enter 전송 <span aria-hidden="true">·</span> Shift+Enter 줄바꿈</span>
        <span aria-label="이번 대화의 질문 수">이번 대화 <strong>{Math.min(Math.ceil(messages.length / 2), 6)} / 6</strong></span></div>
    </form>
    <p className="review-chat__note">계획 변경과 새로고침 시 대화가 초기화됩니다. 입력값 수정은 각 입력 화면에서 진행해 주세요.</p>
  </section>;
}
