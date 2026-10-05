import { describe, expect, it } from 'vitest';
import { callEngine, type EngineArgs } from '../engine/registry';
import { loadSkills, loadTemplates } from './loader';
import { templateSchema } from './schema';

describe('scenario data and loader', () => {
  it('loads the eleven skill ids and names in specification order', () => {
    expect(loadSkills()).toEqual([
      { id: 'margin-job-costing', name: 'Margin & job costing' },
      { id: 'wip-revenue', name: 'WIP & revenue recognition' },
      { id: 'cash-working-capital', name: 'Cash flow & working capital' },
      { id: 'ar-payment-claims', name: 'AR & payment claims' },
      { id: 'ap-suppliers-procurement', name: 'AP, suppliers & procurement' },
      { id: 'variations', name: 'Variations' },
      { id: 'contract-loi-risk', name: 'Contract & LOI risk' },
      { id: 'forecast-variance', name: 'Forecast & variance' },
      { id: 'tender-pricing', name: 'Tender pricing & bid decisions' },
      { id: 'funding-capital', name: 'Funding & cost of capital' },
      { id: 'labour-overhead', name: 'Labour & overhead cost' },
    ]);
  });

  it('loads and parses the first numeric-only Level 2 template, excluding skills.json', () => {
    const templates = loadTemplates();
    expect(templates.map(t => t.id)).toEqual(['cnsw-wip-001']);
    const template = templates[0];
    expect(templateSchema.safeParse(template).success).toBe(true);
    expect(template.level).toBe(2);
    expect(template.rubric.every(point => point.type === 'numeric')).toBe(true);
    const skills = new Set(loadSkills().map(skill => skill.id));
    expect(template.rubric.every(point => skills.has(point.skill))).toBe(true);
  });

  it('reproduces the finance-engine fixture at the first template range midpoints', () => {
    const template = loadTemplates()[0];
    const values: Record<string, number> = Object.fromEntries(template.params.map(p => [p.name, (p.min + p.max) / 2]));
    expect(values).toEqual({ contract: 4_400_000, variations: 600_000, incurred: 3_100_000, remaining: 900_000, claimed: 3_700_000 });
    for (const computed of template.computed) {
      const resolve = (ref: string | number) => typeof ref === 'number' ? ref : values[ref];
      const args: EngineArgs = Object.fromEntries(Object.entries(computed.args).map(([name, value]) => [name, Array.isArray(value) ? value.map(resolve) : resolve(value)]));
      values[computed.id] = callEngine(computed.fn, args);
    }
    expect(values).toMatchObject({ forecastCost: 4_000_000, gp: 1_000_000, gpPct: 20, complete: 77.5, earned: 3_875_000, billing: -175_000 });
  });

  it('returns independent data on each load', () => {
    loadSkills()[0].name = 'Changed';
    loadTemplates()[0].params[0].min = -1;
    expect(loadSkills()[0].name).toBe('Margin & job costing');
    expect(loadTemplates()[0].params[0].min).toBeGreaterThan(0);
  });
});
