import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import type { OpenCodeAgent, OpenCodeSkill, ConversionTarget } from '../types/opencode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find templates directory - works in both src and dist
const isInDist = __dirname.includes('/dist/');
const templatesDir = isInDist 
  ? path.resolve(__dirname, '../../src/templates')
  : path.resolve(__dirname, '../templates');

let agentTemplate: HandlebarsTemplateDelegate | null = null;
let skillTemplate: HandlebarsTemplateDelegate | null = null;

async function loadTemplates(): Promise<void> {
  if (!agentTemplate || !skillTemplate) {
    const [agentSource, skillSource] = await Promise.all([
      fs.readFile(path.join(templatesDir, 'agent.hbs'), 'utf-8'),
      fs.readFile(path.join(templatesDir, 'skill.hbs'), 'utf-8')
    ]);
    
    agentTemplate = Handlebars.compile(agentSource);
    skillTemplate = Handlebars.compile(skillSource);
  }
}

export async function writeAgent(
  agent: OpenCodeAgent,
  outputDir: string,
  target: ConversionTarget
): Promise<void> {
  await loadTemplates();
  
  const targetDir = target === 'opencode' ? '.opencode' : target === 'claude' ? '.claude' : '.agents';
  const agentsDir = path.join(outputDir, targetDir, 'agents');
  await fs.mkdir(agentsDir, { recursive: true });
  
  const content = agentTemplate!({ ...agent.frontmatter, systemPrompt: agent.systemPrompt });
  const filePath = path.join(agentsDir, `${agent.name}.md`);
  
  await fs.writeFile(filePath, content);
}

export async function writeSkill(
  skill: OpenCodeSkill,
  outputDir: string,
  target: ConversionTarget
): Promise<void> {
  await loadTemplates();
  
  const targetDir = target === 'opencode' ? '.opencode' : target === 'claude' ? '.claude' : '.agents';
  const skillDir = path.join(outputDir, targetDir, 'skills', skill.name);
  await fs.mkdir(skillDir, { recursive: true });
  
  const content = skillTemplate!({ ...skill.frontmatter, content: skill.content });
  const filePath = path.join(skillDir, 'SKILL.md');
  
  await fs.writeFile(filePath, content);
}

export async function writeAgents(
  agents: OpenCodeAgent[],
  outputDir: string,
  target: ConversionTarget
): Promise<void> {
  await Promise.all(agents.map(agent => writeAgent(agent, outputDir, target)));
}

export async function writeSkills(
  skills: OpenCodeSkill[],
  outputDir: string,
  target: ConversionTarget
): Promise<void> {
  await Promise.all(skills.map(skill => writeSkill(skill, outputDir, target)));
}
