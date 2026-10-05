import { describe, expect, it } from 'vitest';
import { templateSchema, type Template } from './schema';

function fixture(): Template {
  return {
    id: 'test-wip', version: 1, pack: 'construction-nsw', level: 2,
    title: 'Forecast review', body: 'Cost: {{cost|currency}}.',
    question: 'Find GP for {{contract}} and {{gp|number}}.',
    params: [
      { name: 'contract', min: 100, max: 200, step: 10 },
      { name: 'cost', min: 50, max: 100, step: 10 },
    ],
    constraints: [{ left: 'cost', op: '<=', right: 'contract' }],
    computed: [
      { id: 'gp', fn: 'forecastGp', args: { contractValue: 'contract', approvedVariations: 0, forecastCost: 'cost' } },
      { id: 'fade', fn: 'profitFade', args: { originalGp: 100, currentGp: 'gp' } },
    ],
    numericInputs: [{ id: 'gp-input', label: 'Forecast GP', unit: 'currency' }],
    rubric: [
      { id: 'p1', type: 'numeric', skill: 'margin-job-costing', weight: 2, input: 'gp-input', truth: 'gp', tolerancePct: 1 },
      { id: 'p2', type: 'must_mention', skill: 'wip-revenue', weight: 1, criterion: 'Discuss {{gp|currency}}.', explanation: 'Compare {{cost}} with {{contract}}.' },
    ],
  };
}

describe('templateSchema', () => {
  it('parses a complete template without changing it', () => {
    const template = fixture();
    expect(templateSchema.parse(template)).toEqual(template);
  });

  const invalid: [string, (t: Template) => void][] = [
    ['zero weight', t => { t.rubric[0].weight = 0; }],
    ['negative weight', t => { t.rubric[1].weight = -1; }],
    ['level 4', t => { Object.assign(t, { level: 4 }); }],
    ['zero step', t => { t.params[0].step = 0; }],
    ['negative step', t => { t.params[0].step = -1; }],
    ['reversed range', t => { t.params[0].min = 201; }],
    ['duplicate params', t => { t.params.push({ ...t.params[0] }); }],
    ['duplicate computed ids', t => { t.computed[1].id = 'gp'; }],
    ['param/computed collision', t => { t.computed[0].id = 'cost'; }],
    ['duplicate rubric ids', t => { t.rubric[1].id = 'p1'; }],
    ['duplicate input ids', t => { t.numericInputs.push({ ...t.numericInputs[0] }); }],
    ['missing numeric input', t => { Object.assign(t.rubric[0], { input: 'absent' }); }],
    ['missing truth', t => { Object.assign(t.rubric[0], { truth: 'absent' }); }],
    ['rule without sources', t => { Object.assign(t.rubric[1], { ruleBased: true }); }],
    ['rule with empty sources', t => { Object.assign(t.rubric[1], { ruleBased: true, sources: [] }); }],
    ['unknown body placeholder', t => { t.body = '{{absent}}'; }],
    ['unknown question placeholder', t => { t.question = '{{absent|currency}}'; }],
    ['unknown criterion placeholder', t => { Object.assign(t.rubric[1], { criterion: '{{absent|percent}}' }); }],
    ['unknown explanation placeholder', t => { Object.assign(t.rubric[1], { explanation: '{{absent}}' }); }],
    ['unknown argument', t => { t.computed[0].args.forecastCost = 'absent'; }],
    ['forward argument', t => { t.computed[0].args.forecastCost = 'fade'; }],
    ['self reference', t => { t.computed[0].args.forecastCost = 'gp'; }],
    ['forward array argument', t => { t.computed[0].args.netFlows = ['cost', 'fade']; }],
    ['unknown array argument', t => { t.computed[1].args.netFlows = ['gp', 'absent']; }],
    ['unknown left constraint', t => { t.constraints[0].left = 'absent'; }],
    ['unknown right constraint', t => { t.constraints[0].right = 'absent'; }],
    ['expression argument', t => { t.computed[0].args.forecastCost = 'cost + 1'; }],
    ['nonfinite range', t => { t.params[0].max = Infinity; }],
    ['nonfinite literal', t => { t.computed[0].args.approvedVariations = NaN; }],
    ['negative tolerance', t => { Object.assign(t.rubric[0], { tolerancePct: -1 }); }],
    ['unknown placeholder format', t => { t.body = '{{cost|money}}'; }],
  ];

  it.each(invalid)('rejects %s', (_name, mutate) => {
    const template = fixture();
    mutate(template);
    expect(templateSchema.safeParse(template).success).toBe(false);
  });

  it('accepts array refs to params, earlier computations and literals', () => {
    const template = fixture();
    template.computed.push({ id: 'deficit', fn: 'peakCashDeficit', args: { opening: 0, netFlows: ['gp', 'cost', -10] } });
    expect(templateSchema.safeParse(template).success).toBe(true);
  });

  it('accepts constraints on resolved computed values and literals', () => {
    const template = fixture();
    template.constraints.push({ left: 'gp', op: '>', right: 0 });
    expect(templateSchema.safeParse(template).success).toBe(true);
  });

  it('accepts a rule-based red flag with a citation', () => {
    const template = fixture();
    Object.assign(template.rubric[1], { type: 'red_flag', ruleBased: true, sources: [{ citation: 'Fixture source', url: 'https://example.test/rule' }] });
    expect(templateSchema.safeParse(template).success).toBe(true);
  });

  it('accepts fixed parameters, exact tolerance and param truth references', () => {
    const template = fixture();
    template.params[0].max = template.params[0].min;
    Object.assign(template.rubric[0], { truth: 'cost', tolerancePct: 0 });
    expect(templateSchema.safeParse(template).success).toBe(true);
  });
});
