import * as finance from './functions';
import { EngineError } from './errors';

export type EngineArgs = Record<string, number | number[]>;
export type EngineFn = (args: EngineArgs) => number;

function requiredArg(args: EngineArgs, name: string): number | number[] {
  if (!Object.hasOwn(args, name)) {
    throw new EngineError(`Missing engine argument: ${name}`);
  }
  return args[name];
}

function numberArg(args: EngineArgs, name: string): number {
  const value = requiredArg(args, name);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new EngineError(`Engine argument must be a finite number: ${name}`);
  }
  return value;
}

function arrayArg(args: EngineArgs, name: string): number[] {
  const value = requiredArg(args, name);
  if (!Array.isArray(value)) {
    throw new EngineError(`Engine argument must be an array of finite numbers: ${name}`);
  }
  // Iteration also rejects holes, which Array.every would skip.
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      throw new EngineError(`Engine argument must be an array of finite numbers: ${name}`);
    }
  }
  return value;
}

export const engineRegistry: Record<string, EngineFn> = {
  eac: (args) => finance.eac({
    costIncurred: numberArg(args, 'costIncurred'),
    estimateToComplete: numberArg(args, 'estimateToComplete'),
  }),
  forecastGp: (args) => finance.forecastGp({
    contractValue: numberArg(args, 'contractValue'),
    approvedVariations: numberArg(args, 'approvedVariations'),
    forecastCost: numberArg(args, 'forecastCost'),
  }),
  forecastGpPct: (args) => finance.forecastGpPct({
    contractValue: numberArg(args, 'contractValue'),
    approvedVariations: numberArg(args, 'approvedVariations'),
    forecastCost: numberArg(args, 'forecastCost'),
  }),
  percentComplete: (args) => finance.percentComplete({
    costIncurred: numberArg(args, 'costIncurred'),
    estimateToComplete: numberArg(args, 'estimateToComplete'),
  }),
  earnedRevenue: (args) => finance.earnedRevenue({
    contractValue: numberArg(args, 'contractValue'),
    approvedVariations: numberArg(args, 'approvedVariations'),
    percentComplete: numberArg(args, 'percentComplete'),
  }),
  overUnderBilling: (args) => finance.overUnderBilling({
    claimedToDate: numberArg(args, 'claimedToDate'),
    earnedRevenue: numberArg(args, 'earnedRevenue'),
  }),
  profitFade: (args) => finance.profitFade({
    originalGp: numberArg(args, 'originalGp'),
    currentGp: numberArg(args, 'currentGp'),
  }),
  retentionHeld: (args) => finance.retentionHeld({
    claimedToDate: numberArg(args, 'claimedToDate'),
    retentionPct: numberArg(args, 'retentionPct'),
    contractSum: numberArg(args, 'contractSum'),
    capPct: numberArg(args, 'capPct'),
  }),
  peakCashDeficit: (args) => finance.peakCashDeficit({
    opening: numberArg(args, 'opening'),
    netFlows: arrayArg(args, 'netFlows'),
  }),
  markupFromMargin: (args) => finance.markupFromMargin({
    marginPct: numberArg(args, 'marginPct'),
  }),
  interestCost: (args) => finance.interestCost({
    principal: numberArg(args, 'principal'),
    annualRatePct: numberArg(args, 'annualRatePct'),
    days: numberArg(args, 'days'),
  }),
};

/** Validated entry point for computations named by scenario templates. */
export function callEngine(fn: string, args: EngineArgs): number {
  if (!Object.hasOwn(engineRegistry, fn)) {
    throw new EngineError('Unknown engine function');
  }
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    throw new EngineError('Engine arguments must be an object');
  }
  const result = engineRegistry[fn](args);
  if (!Number.isFinite(result)) {
    throw new EngineError('Engine result must be finite');
  }
  return result;
}
