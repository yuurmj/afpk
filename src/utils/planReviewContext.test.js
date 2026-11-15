import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customer } from '../data/customer.js';
import { allocationItems } from '../data/allocationPlan.js';
import { createPlanReviewPayload } from './planReviewContext.js';

test('AI review includes five-year assumptions without requiring an extra goal', () => {
  const payload = createPlanReviewPayload(customer, allocationItems, null);
  assert.equal(payload.scenario, null);
  assert.equal(payload.monteCarlo, null);
  assert.equal(payload.allocationExpenseReduction, 130000);
  assert.deepEqual(payload.planStress, {
    periodMonths: [12,12,12,24], isaStockRatio: 0.6, isaDropRate: 0.35,
  });
});

test('AI review receives the currently edited allocations rather than initial values', () => {
  const edited = allocationItems.map(item => item.id === 'isa' ? { ...item, monthly: [0,0,0,0] } : item);
  const payload = createPlanReviewPayload(customer, edited, null);
  assert.deepEqual(payload.allocationItems.find(item => item.id === 'isa').monthly, [0,0,0,0]);
  assert.deepEqual(allocationItems.find(item => item.id === 'isa').monthly, [0,690000,490000,490000]);
});

test('optional analyses continue to be forwarded to AI without changing their contents', () => {
  const monteCarlo = { runs: 1000, successRate: 0.2 };
  const scenario = { goal: { targetAmount: 20000000, remainingMonths: 12 }, monteCarlo };
  const payload = createPlanReviewPayload(customer, allocationItems, { scenario, adjustmentExceedsCapacity: true });
  assert.equal(payload.scenario, scenario);
  assert.equal(payload.monteCarlo, monteCarlo);
  assert.equal(payload.adjustmentExceedsCapacity, true);
});
