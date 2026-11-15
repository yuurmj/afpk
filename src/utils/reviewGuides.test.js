import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getReviewGuide } from './reviewGuides.js';

test('guides dependent features to goal input until a valid scenario exists', () => {
  for (const id of ['goal','stress','monteCarlo','adjustment']) {
    const guide = getReviewGuide(id, false);
    assert.equal(guide.fieldId, 'target-amount');
    assert.ok(guide.description.length > 20);
    assert.ok(!/검토 자료가 없습니다|자료 없음/.test(guide.description));
  }
});
test('points prepared goals to the actual controls without overwriting inputs', () => {
  assert.equal(getReviewGuide('stress', true).fieldId, 'shock-months');
  assert.equal(getReviewGuide('monteCarlo', true).fieldId, 'run-monte-carlo');
  assert.equal(getReviewGuide('adjustment', true).fieldId, 'adjusted-target');
  const guide = getReviewGuide('goal', true); guide.fieldId = 'modified';
  assert.equal(getReviewGuide('goal', true).fieldId, 'target-amount');
});
