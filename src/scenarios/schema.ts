import { z } from 'zod';

const text = z.string().min(1);
const refSchema = z.union([text, z.number()]);
const skillSchema = z.object({ id: text, name: text });
const paramSchema = z.object({ name: text, min: z.number(), max: z.number(), step: z.number().positive() });
const constraintSchema = z.object({ left: refSchema, op: z.enum(['<', '<=', '>', '>=', '!=']), right: refSchema });
const computedSchema = z.object({ id: text, fn: text, args: z.record(z.string(), z.union([refSchema, z.array(refSchema)])) });
const numericInputSchema = z.object({ id: text, label: text, unit: z.enum(['currency', 'percent', 'number']) });
const rubricPointSchema = z.union([
  z.object({
    id: text, type: z.literal('numeric'), skill: text, weight: z.number().positive(),
    input: text, truth: text, tolerancePct: z.number().min(0).max(100),
  }),
  z.object({
    id: text, type: z.enum(['must_mention', 'red_flag']), skill: text, weight: z.number().positive(),
    criterion: text, explanation: text, ruleBased: z.boolean().optional(),
    sources: z.array(z.object({ citation: text, url: z.url() })).optional(),
  }),
]);

export type Skill = z.infer<typeof skillSchema>;
export type Ref = z.infer<typeof refSchema>;
export type Param = z.infer<typeof paramSchema>;
export type Constraint = z.infer<typeof constraintSchema>;
export type Computed = z.infer<typeof computedSchema>;
export type NumericInput = z.infer<typeof numericInputSchema>;
export type RubricPoint = z.infer<typeof rubricPointSchema>;

export const skillsSchema = z.array(skillSchema).superRefine((skills, ctx) => {
  const ids = new Set<string>();
  skills.forEach((skill, index) => {
    if (ids.has(skill.id)) ctx.addIssue({ code: 'custom', path: [index, 'id'], message: 'Duplicate skill id' });
    ids.add(skill.id);
  });
});

const templateShape = z.object({
  id: text, version: z.number().int().positive(), pack: text, level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: text, body: text, question: text, params: z.array(paramSchema), constraints: z.array(constraintSchema),
  computed: z.array(computedSchema), numericInputs: z.array(numericInputSchema), rubric: z.array(rubricPointSchema).min(1),
});

export type Template = z.infer<typeof templateShape>;

export const templateSchema: z.ZodType<Template> = templateShape.superRefine((template, ctx) => {
  type Path = (string | number)[];
  const issue = (path: Path, message: string) => ctx.addIssue({ code: 'custom', path, message });
  const addId = (ids: Set<string>, id: string, path: Path) => {
    if (ids.has(id)) issue(path, `Duplicate id: ${id}`);
    ids.add(id);
  };
  const checkRef = (ref: Ref, available: Set<string>, path: Path) => {
    if (typeof ref === 'string' && !available.has(ref)) issue(path, `Unknown or forward reference: ${ref}`);
  };

  const values = new Set<string>();
  template.params.forEach((param, index) => {
    addId(values, param.name, ['params', index, 'name']);
    if (param.min > param.max) issue(['params', index, 'max'], 'Maximum must be at least minimum');
  });
  template.computed.forEach((computed, index) => {
    for (const [name, arg] of Object.entries(computed.args)) {
      const path: Path = ['computed', index, 'args', name];
      if (Array.isArray(arg)) arg.forEach((ref, i) => checkRef(ref, values, [...path, i]));
      else checkRef(arg, values, path);
    }
    addId(values, computed.id, ['computed', index, 'id']);
  });

  // Constraints run after all ordered computations have resolved.
  template.constraints.forEach((constraint, index) => {
    checkRef(constraint.left, values, ['constraints', index, 'left']);
    checkRef(constraint.right, values, ['constraints', index, 'right']);
  });

  const checkPlaceholders = (value: string, path: Path) => {
    for (const match of value.matchAll(/\{\{(.*?)\}\}/g)) {
      const [name, format, ...extra] = match[1].split('|');
      checkRef(name, values, path);
      if (extra.length || (format !== undefined && !['currency', 'percent', 'number'].includes(format))) {
        issue(path, `Invalid placeholder format: ${match[0]}`);
      }
    }
  };
  checkPlaceholders(template.body, ['body']);
  checkPlaceholders(template.question, ['question']);

  const inputs = new Set<string>();
  template.numericInputs.forEach((input, index) => addId(inputs, input.id, ['numericInputs', index, 'id']));
  const points = new Set<string>();
  template.rubric.forEach((point, index) => {
    addId(points, point.id, ['rubric', index, 'id']);
    if (point.type === 'numeric') {
      checkRef(point.input, inputs, ['rubric', index, 'input']);
      checkRef(point.truth, values, ['rubric', index, 'truth']);
    } else {
      if (point.ruleBased && !point.sources?.length) issue(['rubric', index, 'sources'], 'Rule-based points require a source');
      checkPlaceholders(point.criterion, ['rubric', index, 'criterion']);
      checkPlaceholders(point.explanation, ['rubric', index, 'explanation']);
    }
  });
});
