import { describe, expect, it } from 'vitest';
import {
  eac, forecastGp, forecastGpPct, percentComplete, earnedRevenue,
  overUnderBilling, profitFade, retentionHeld, peakCashDeficit,
  markupFromMargin, interestCost,
} from './functions';

const job = {
  contractValue: 4_400_000,
  approvedVariations: 600_000,
  costIncurred: 3_100_000,
  estimateToComplete: 900_000,
};

describe('finance functions', () => {
  it('adds incurred cost and the remaining estimate for EAC', () => {
    expect(eac(job)).toBe(4_000_000);
  });
  it('includes approved variations in forecast GP', () => {
    expect(forecastGp({ ...job, forecastCost: 4_000_000 })).toBe(1_000_000);
  });
  it('reports GP as a percentage of revenue on the 0-100 scale', () => {
    expect(forecastGpPct({ ...job, forecastCost: 4_000_000 })).toBe(20);
  });
  it('measures completion against estimated total cost', () => {
    expect(percentComplete(job)).toBe(77.5);
  });
  it('earns revenue including variations using a 0-100 percentage', () => {
    expect(earnedRevenue({ ...job, percentComplete: 77.5 })).toBe(3_875_000);
  });
  it.each([
    [3_700_000, -175_000], [4_000_000, 125_000], [3_875_000, 0],
  ])('reports signed over/underbilling for claims of %i', (claimedToDate, expected) => {
    expect(overUnderBilling({ claimedToDate, earnedRevenue: 3_875_000 })).toBe(expected);
  });
  it.each([[1_000_000, 200_000], [1_300_000, -100_000]])(
    'reports profit fade for current GP of %i', (currentGp, expected) => {
      expect(profitFade({ originalGp: 1_200_000, currentGp })).toBe(expected);
    },
  );
  it.each([[3_700_000, 250_000], [1_000_000, 100_000], [2_500_000, 250_000], [0, 0]])(
    'caps retention for claims of %i', (claimedToDate, expected) => {
      expect(retentionHeld({ claimedToDate, retentionPct: 10, contractSum: 5_000_000, capPct: 5 })).toBe(expected);
    },
  );
  it.each([
    { opening: 420_000, netFlows: [-300_000, -250_000, 400_000], expected: 130_000 },
    { opening: 420_000, netFlows: [-100_000, 50_000], expected: 0 },
    { opening: -200_000, netFlows: [300_000], expected: 200_000 },
    { opening: -200_000, netFlows: [], expected: 200_000 },
    { opening: 0, netFlows: [], expected: 0 },
    { opening: 100, netFlows: [-100], expected: 0 },
    { opening: 100, netFlows: [-150, 100, -250, 500], expected: 200 },
  ])('finds the largest running shortfall: $opening, $netFlows', ({ opening, netFlows, expected }) => {
    expect(peakCashDeficit({ opening, netFlows })).toBe(expected);
  });
  it('does not mutate the cash flow array', () => {
    const netFlows = [-300_000, -250_000, 400_000];
    Object.freeze(netFlows);
    const args = Object.freeze({ opening: 420_000, netFlows });
    expect(peakCashDeficit(args)).toBe(130_000);
    expect(peakCashDeficit(args)).toBe(130_000);
    expect(netFlows).toEqual([-300_000, -250_000, 400_000]);
  });
  it('converts a revenue margin into a cost markup', () => {
    expect(markupFromMargin({ marginPct: 20 })).toBe(25);
  });
  it('calculates simple interest using a 365-day year without rounding', () => {
    expect(interestCost({ principal: 500_000, annualRatePct: 8, days: 90 })).toBeCloseTo(9863.01, 2);
    expect(interestCost({ principal: 1, annualRatePct: 50, days: 365 })).toBe(0.5);
  });
  it('preserves losses rather than clamping GP to zero', () => {
    const loss = { contractValue: 100, approvedVariations: 0, forecastCost: 120 };
    expect(forecastGp(loss)).toBe(-20);
    expect(forecastGpPct(loss)).toBe(-20);
  });
});
