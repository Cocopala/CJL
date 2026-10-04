/** Pure arithmetic; percentages use the 0-100 scale and results are not rounded. */
type CostEstimate = { costIncurred: number; estimateToComplete: number };
type Revenue = { contractValue: number; approvedVariations: number };
type Forecast = Revenue & { forecastCost: number };

export function eac({ costIncurred, estimateToComplete }: CostEstimate): number {
  return costIncurred + estimateToComplete;
}

export function forecastGp({ contractValue, approvedVariations, forecastCost }: Forecast): number {
  return contractValue + approvedVariations - forecastCost;
}

export function forecastGpPct(args: Forecast): number {
  return forecastGp(args) / (args.contractValue + args.approvedVariations) * 100;
}

export function percentComplete(args: CostEstimate): number {
  return args.costIncurred / eac(args) * 100;
}

export function earnedRevenue({ contractValue, approvedVariations, percentComplete }: Revenue & { percentComplete: number }): number {
  return (contractValue + approvedVariations) * percentComplete / 100;
}

/** Positive means overbilled; negative means underbilled. */
export function overUnderBilling({ claimedToDate, earnedRevenue }: { claimedToDate: number; earnedRevenue: number }): number {
  return claimedToDate - earnedRevenue;
}

export function profitFade({ originalGp, currentGp }: { originalGp: number; currentGp: number }): number {
  return originalGp - currentGp;
}

export function retentionHeld({ claimedToDate, retentionPct, contractSum, capPct }: {
  claimedToDate: number; retentionPct: number; contractSum: number; capPct: number;
}): number {
  return Math.min(claimedToDate * retentionPct / 100, contractSum * capPct / 100);
}

/** Includes the opening balance and returns the worst shortfall as a positive amount. */
export function peakCashDeficit({ opening, netFlows }: { opening: number; netFlows: number[] }): number {
  let balance = opening;
  let lowest = Math.min(0, balance);
  for (const flow of netFlows) {
    balance += flow;
    lowest = Math.min(lowest, balance);
  }
  return Math.max(0, -lowest);
}

export function markupFromMargin({ marginPct }: { marginPct: number }): number {
  return marginPct / (100 - marginPct) * 100;
}

export function interestCost({ principal, annualRatePct, days }: { principal: number; annualRatePct: number; days: number }): number {
  return principal * annualRatePct / 100 * days / 365;
}
