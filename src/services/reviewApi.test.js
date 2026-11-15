import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestPlanReview } from './reviewApi.js';

test('returns structured facts and advice and forwards cancellation', async () => {
  const original = globalThis.fetch;
  const signal = new AbortController().signal;
  const result = { review:'검토', sections: Array.from({length:6}, (_, i) => ({id:String(i), evidence:[], findings:[], advice:{problem:'확인',action:'조정'}})) };
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/review-plan'); assert.equal(init.signal, signal);
      assert.deepEqual(JSON.parse(init.body), {customer:{totalAssets:20000000}});
      return {ok:true, json:async () => result};
    };
    assert.deepEqual(await requestPlanReview({customer:{totalAssets:20000000}},signal),result);
  } finally { globalThis.fetch = original; }
});
test('surfaces server errors and rejects partial review output', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ok:false,json:async () => ({message:'호출 한도에 도달했습니다.'})});
    await assert.rejects(requestPlanReview({}), /호출 한도/);
    globalThis.fetch = async () => ({ok:true,json:async () => ({review:'불완전한 결과',sections:[]})});
    await assert.rejects(requestPlanReview({}), /결과 형식/);
  } finally { globalThis.fetch = original; }
});
