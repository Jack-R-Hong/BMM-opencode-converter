import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ClaudeCodeAgent, ClaudeCodeSkill } from '../types/claude.js';

function serializeClaudeAgentFrontmatter(fm: ClaudeCodeAgent['frontmatter']): string {
  const lines = ['---'];
  lines.push(`name: ${JSON.stringify(fm.name)}`);
  lines.push(`description: ${JSON.stringify(fm.description)}`);
  if (fm.tools) lines.push(`tools: ${JSON.stringify(fm.tools)}`);
  if (fm.disallowedTools) lines.push(`disallowedTools: ${JSON.stringify(fm.disallowedTools)}`);
  if (fm.model) lines.push(`model: ${fm.model}`);
  if (fm.permissionMode) lines.push(`permissionMode: ${fm.permissionMode}`);
  if (fm.maxTurns !== undefined) lines.push(`maxTurns: ${fm.maxTurns}`);
  if (fm.skills && fm.skills.length > 0) {
    lines.push('skills:');
    for (const skill of fm.skills) {
      lines.push(`  - ${skill}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function serializeClaudeSkillFrontmatter(fm: ClaudeCodeSkill['frontmatter']): string {
  const lines = ['---'];
  lines.push(`name: ${fm.name}`);
  lines.push(`description: ${JSON.stringify(fm.description)}`);
  if (fm['allowed-tools']) lines.push(`allowed-tools: ${JSON.stringify(fm['allowed-tools'])}`);
  if (fm['user-invocable'] !== undefined) lines.push(`user-invocable: ${fm['user-invocable']}`);
  if (fm['disable-model-invocation'] !== undefined) lines.push(`disable-model-invocation: ${fm['disable-model-invocation']}`);
  if (fm['argument-hint']) lines.push(`argument-hint: ${JSON.stringify(fm['argument-hint'])}`);
  if (fm.context?.fork !== undefined) {
    lines.push('context:');
    lines.push(`  fork: ${fm.context.fork}`);
  }
  if (fm.agent) lines.push(`agent: ${fm.agent}`);
  lines.push('---');
  return lines.join('\n');
}

export function writeClaudeAgent(outputDir: string, agent: ClaudeCodeAgent): void {
  const agentDir = path.join(outputDir, '.claude', 'agents');
  fs.mkdirSync(agentDir, { recursive: true });

  const content = serializeClaudeAgentFrontmatter(agent.frontmatter) + '\n\n' + agent.prompt;
  fs.writeFileSync(path.join(agentDir, agent.filename), content);
}

export function writeClaudeSkill(outputDir: string, skill: ClaudeCodeSkill): void {
  const skillDir = path.join(outputDir, '.claude', 'skills', skill.folder);
  fs.mkdirSync(skillDir, { recursive: true });

  const content = serializeClaudeSkillFrontmatter(skill.frontmatter) + '\n\n' + skill.content;
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
}
