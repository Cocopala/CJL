import { describe, expect, it } from 'vitest';
import { EngineError } from './errors';
import { callEngine, engineRegistry, type EngineArgs } from './registry';

const cases: [string, EngineArgs, number][] = [
  ['eac', { costIncurred: 3_100_000, estimateToComplete: 900_000 }, 4_000_000],
  ['forecastGp', { contractValue: 4_400_000, approvedVariations: 600_000, forecastCost: 4_000_000 }, 1_000_000],
  ['forecastGpPct', { contractValue: 4_400_000, approvedVariations: 600_000, forecastCost: 4_000_000 }, 20],
  ['percentComplete', { costIncurred: 3_100_000, estimateToComplete: 900_000 }, 77.5],
  ['earnedRevenue', { contractValue: 4_400_000, approvedVariations: 600_000, percentComplete: 77.5 }, 3_875_000],
  ['overUnderBilling', { claimedToDate: 3_700_000, earnedRevenue: 3_875_000 }, -175_000],
  ['profitFade', { originalGp: 1_200_000, currentGp: 1_000_000 }, 200_000],
  ['retentionHeld', { claimedToDate: 3_700_000, retentionPct: 10, contractSum: 5_000_000, capPct: 5 }, 250_000],
  ['peakCashDeficit', { opening: 420_000, netFlows: [-300_000, -250_000, 400_000] }, 130_000],
  ['markupFromMargin', { marginPct: 20 }, 25],
  ['interestCost', { principal: 500_000, annualRatePct: 8, days: 365 }, 40_000],
];

describe('engine registry', () => {
  it.each(cases)('dispatches %s with named arguments', (name, args, expected) => {
    expect(callEngine(name, args)).toBe(expected);
    expect(engineRegistry[name](args)).toBe(expected);
  });
  it.each(['nope', 'toString', 'constructor', '__proto__'])('rejects unknown function %s', (name) => {
    expect(() => callEngine(name, {})).toThrow(EngineError);
  });
  it.each(cases)('requires every argument for %s', (name, args) => {
    for (const key of Object.keys(args)) {
      const incomplete = { ...args };
      delete incomplete[key];
      expect(() => callEngine(name, incomplete)).toThrow(EngineError);
    }
  });
  it.each([
    ['forecastGpPct', { contractValue: 0, approvedVariations: 0, forecastCost: 0 }],
    ['markupFromMargin', { marginPct: 100 }],
    ['percentComplete', { costIncurred: 0, estimateToComplete: 0 }],
    ['eac', { costIncurred: Number.MAX_VALUE, estimateToComplete: Number.MAX_VALUE }],
  ] satisfies [string, EngineArgs][])('rejects non-finite results from %s', (name, args) => {
    expect(() => callEngine(name, args)).toThrow(EngineError);
  });
  it.each([NaN, Infinity, -Infinity, [100], '100', undefined, null])(
    'rejects malformed scalar input %s', (costIncurred) => {
      const args = { costIncurred, estimateToComplete: 20 } as EngineArgs;
      expect(() => callEngine('eac', args)).toThrow(EngineError);
    },
  );
  it.each([0, null, [-1, NaN], [-1, Infinity], [-Infinity, 1], ['1'], new Array(1)])(
    'rejects malformed net flows %s', (netFlows) => {
      expect(() => callEngine('peakCashDeficit', { opening: 0, netFlows } as EngineArgs)).toThrow(EngineError);
    },
  );
  it('accepts zero values, empty flows and extra numeric fields', () => {
    expect(callEngine('peakCashDeficit', { opening: 0, netFlows: [], unused: 5 })).toBe(0);
    expect(callEngine('forecastGp', { contractValue: 0, approvedVariations: 0, forecastCost: 0 })).toBe(0);
  });
  it('does not accept inherited arguments as supplied inputs', () => {
    const args = Object.create({ costIncurred: 100, estimateToComplete: 20 }) as EngineArgs;
    expect(() => callEngine('eac', args)).toThrow(EngineError);
  });
  it.each([null, undefined, 100, []])('rejects a malformed argument object %s', (args) => {
    expect(() => callEngine('eac', args as unknown as EngineArgs)).toThrow(EngineError);
  });
});
