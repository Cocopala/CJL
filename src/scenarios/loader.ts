import skills from '../../scenarios/skills.json';
import { skillsSchema, templateSchema, type Skill, type Template } from './schema';

const templates = import.meta.glob('/scenarios/*/*.json', { eager: true, import: 'default' });

export function loadSkills(): Skill[] {
  return skillsSchema.parse(skills);
}

export function loadTemplates(): Template[] {
  return Object.keys(templates).sort().map(path => templateSchema.parse(templates[path]));
}
