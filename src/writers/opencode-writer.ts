import * as fs from 'node:fs';
import * as path from 'node:path';
import type { OpenCodeAgent, OpenCodeSkill } from '../types/opencode.js';

export function writeOpenCodeAgent(outputDir: string, agent: OpenCodeAgent): void {
  const agentDir = path.join(outputDir, '.opencode', 'agents');
  fs.mkdirSync(agentDir, { recursive: true });

  const frontmatterLines = ['---'];
  frontmatterLines.push(`description: ${JSON.stringify(agent.frontmatter.description)}`);
  if (agent.frontmatter.mode) frontmatterLines.push(`mode: ${agent.frontmatter.mode}`);
  if (agent.frontmatter.tools) {
    frontmatterLines.push('tools:');
    for (const [tool, enabled] of Object.entries(agent.frontmatter.tools)) {
      if (enabled !== undefined) frontmatterLines.push(`  ${tool}: ${enabled}`);
    }
  }
  frontmatterLines.push('---');

  const content = frontmatterLines.join('\n') + '\n\n' + agent.prompt;
  fs.writeFileSync(path.join(agentDir, agent.filename), content);
}

export function writeOpenCodeSkill(outputDir: string, skill: OpenCodeSkill): void {
  const skillDir = path.join(outputDir, '.opencode', 'skills', skill.folder);
  fs.mkdirSync(skillDir, { recursive: true });

  const frontmatterLines = ['---'];
  frontmatterLines.push(`name: ${skill.frontmatter.name}`);
  frontmatterLines.push(`description: ${JSON.stringify(skill.frontmatter.description)}`);
  if (skill.frontmatter.license) frontmatterLines.push(`license: ${skill.frontmatter.license}`);
  if (skill.frontmatter.compatibility) frontmatterLines.push(`compatibility: ${skill.frontmatter.compatibility}`);
  if (skill.frontmatter.metadata) {
    frontmatterLines.push('metadata:');
    for (const [key, value] of Object.entries(skill.frontmatter.metadata)) {
      frontmatterLines.push(`  ${key}: ${JSON.stringify(value)}`);
    }
  }
  frontmatterLines.push('---');

  const content = frontmatterLines.join('\n') + '\n\n' + skill.content;
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
}
