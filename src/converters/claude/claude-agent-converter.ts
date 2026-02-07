import type { BmadAgent } from '../../types/bmad.js';
import type { ClaudeCodeAgent, ClaudeCodeSkill } from '../../types/claude.js';
import type { AgentSkillOwnership } from '../ownership.js';

const CLAUDE_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'];

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanAgentId(agentId: string): string {
  return agentId
    .replace(/\.agent\.yaml$/, '')
    .replace(/\.md$/, '')
    .replace(/\//g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildAgentPrompt(agent: BmadAgent): string {
  const lines: string[] = [];

  if (agent.icon) {
    lines.push(`${agent.icon} **${agent.title}** - ${agent.name}`);
    lines.push('');
  }

  if (agent.persona.role) {
    lines.push(`## Role`);
    lines.push(agent.persona.role);
    lines.push('');
  }

  if (agent.persona.identity) {
    lines.push(`## Identity`);
    lines.push(agent.persona.identity);
    lines.push('');
  }

  if (agent.persona.communicationStyle) {
    lines.push(`## Communication Style`);
    lines.push(agent.persona.communicationStyle);
    lines.push('');
  }

  if (agent.persona.principles.length > 0) {
    lines.push(`## Principles`);
    for (const principle of agent.persona.principles) {
      lines.push(`- ${principle}`);
    }
    lines.push('');
  }

  if (agent.activation.rules.length > 0) {
    lines.push(`## Rules`);
    for (const rule of agent.activation.rules) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function buildSkillContent(agent: BmadAgent): string {
  const lines: string[] = [];

  lines.push(`# ${agent.title} Agent Skill`);
  lines.push('');
  lines.push(`Invoke this skill to activate the ${agent.name} agent persona.`);
  lines.push('');

  if (agent.activation.steps.length > 0) {
    lines.push(`## Activation Steps`);
    lines.push('');
    for (let i = 0; i < agent.activation.steps.length; i++) {
      lines.push(`${i + 1}. ${agent.activation.steps[i]}`);
    }
    lines.push('');
  }

  if (agent.menu.length > 0) {
    lines.push(`## Available Commands`);
    lines.push('');
    for (const item of agent.menu) {
      if (item.workflow) {
        lines.push(`- **${item.cmd}**: ${item.label} (workflow: \`${item.workflow}\`)`);
      } else if (item.exec) {
        lines.push(`- **${item.cmd}**: ${item.label} (exec: \`${item.exec}\`)`);
      } else {
        lines.push(`- **${item.cmd}**: ${item.label}`);
      }
    }
    lines.push('');
  }

  if (agent.persona.role) {
    lines.push(`## Persona`);
    lines.push('');
    lines.push(`**Role:** ${agent.persona.role}`);
    lines.push('');
    if (agent.persona.identity) {
      lines.push(`**Identity:** ${agent.persona.identity}`);
      lines.push('');
    }
    if (agent.persona.communicationStyle) {
      lines.push(`**Style:** ${agent.persona.communicationStyle}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

export function convertClaudeAgent(
  agent: BmadAgent,
  ownership?: AgentSkillOwnership,
): { agent: ClaudeCodeAgent; skill: ClaudeCodeSkill } {
  const cleanId = cleanAgentId(agent.id);
  const agentName = toKebabCase(`${agent.module}-${cleanId}`);
  const skillName = toKebabCase(`bmad-${agent.module}-${cleanId}`);

  const skills = ownership ? [...ownership.ownedSkills] : [];
  if (!skills.includes(skillName)) {
    skills.unshift(skillName);
  }

  const claudeAgent: ClaudeCodeAgent = {
    filename: `${agentName}.md`,
    frontmatter: {
      name: agent.name,
      description: agent.frontmatter.description || agent.title,
      tools: CLAUDE_TOOLS.join(', '),
      model: 'inherit',
      permissionMode: 'default',
      skills,
    },
    prompt: buildAgentPrompt(agent),
    sourceModule: agent.module,
    sourceBmadAgent: cleanId,
  };

  const claudeSkill: ClaudeCodeSkill = {
    name: skillName,
    folder: skillName,
    frontmatter: {
      name: skillName,
      description: `${agent.title} - ${agent.persona.role || agent.frontmatter.description}`,
    },
    content: buildSkillContent(agent),
    sourceModule: agent.module,
    sourceType: 'agent',
    sourceName: cleanId,
  };

  return { agent: claudeAgent, skill: claudeSkill };
}

export function convertClaudeAgents(
  agents: BmadAgent[],
  ownershipMap?: Map<string, AgentSkillOwnership>,
): { agents: ClaudeCodeAgent[]; skills: ClaudeCodeSkill[] } {
  const result = {
    agents: [] as ClaudeCodeAgent[],
    skills: [] as ClaudeCodeSkill[],
  };

  for (const agent of agents) {
    const cleanId = cleanAgentId(agent.id);
    const agentSkillName = toKebabCase(`bmad-${agent.module}-${cleanId}`);
    const ownership = ownershipMap?.get(agentSkillName);
    const converted = convertClaudeAgent(agent, ownership);
    result.agents.push(converted.agent);
    result.skills.push(converted.skill);
  }

  return result;
}
