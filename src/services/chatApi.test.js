import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestPlanChat } from './chatApi.js';

test('sends the current plan and multi turn history and forwards abort', async () => {
  const original = globalThis.fetch;
  const signal = new AbortController().signal;
  const data = {plan:{customer:{totalAssets:20000000}},reviewText:'검토', messages:[
    {role:'user',text:'왜?'},{role:'assistant',text:'배분을 확인하세요.'},{role:'user',text:'어떤 배분?'}]};
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url,'/api/review-plan/chat'); assert.equal(options.signal,signal);
      assert.deepEqual(JSON.parse(options.body),data);
      return {ok:true,json:async () => ({answer:'현재 배분표를 확인해 주세요.'})};
    };
    assert.equal(await requestPlanChat(data,signal),'현재 배분표를 확인해 주세요.');
  } finally {globalThis.fetch=original;}
});
test('surfaces quota errors and rejects empty answers', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch=async () => ({ok:false,json:async () => ({message:'호출 한도 초과'})});
    await assert.rejects(requestPlanChat({}),/호출 한도/);
    globalThis.fetch=async () => ({ok:true,json:async () => ({answer:' '})});
    await assert.rejects(requestPlanChat({}),/답변이 비어/);
  } finally {globalThis.fetch=original;}
});
