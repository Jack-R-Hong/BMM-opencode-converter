import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { parseMarkdown } from '../parsers/markdown-parser.js';
import type { BMADAgentManifestRow, BMADAgentFile } from '../types/bmad.js';
import type { OpenCodeAgent, OpenCodeSkill } from '../types/opencode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isInDist = __dirname.includes('/dist/');
const agentSkillsPath = isInDist
  ? path.resolve(__dirname, '../../src/agent-skills.json')
  : path.resolve(__dirname, '../agent-skills.json');

export interface AgentSkillEntry {
  displayName: string;
  module: string;
  workflows: string[];
  tasks?: string[];
}

export type AgentSkillsMap = Record<string, AgentSkillEntry>;

let agentSkillsCache: AgentSkillsMap | null = null;

async function loadAgentSkills(): Promise<AgentSkillsMap> {
  if (!agentSkillsCache) {
    const raw = await fs.readFile(agentSkillsPath, 'utf-8');
    agentSkillsCache = JSON.parse(raw) as AgentSkillsMap;
  }
  return agentSkillsCache;
}

/**
 * Build the specific skill name for a workflow or task, following the
 * naming convention used by workflow-converter and task-converter:
 *   core module  → bmad-{name}
 *   other module → bmad-{module}-{name}
 */
function toSkillName(module: string, name: string): string {
  return module === 'core' ? `bmad-${name}` : `bmad-${module}-${name}`;
}

export interface AgentConversionResult {
  agent: OpenCodeAgent;
  skill: OpenCodeSkill;
}

export async function convertAgent(
  manifest: BMADAgentManifestRow,
  bmadDir: string
): Promise<AgentConversionResult> {
  const relativePath = manifest.path.replace(/^_bmad\//, '');
  const agentPath = path.join(bmadDir, relativePath);
  const parsed = await parseMarkdown(agentPath);

  const agentSkills = await loadAgentSkills();
  const agentName = createAgentName(manifest);
  const skillName = createSkillName(manifest);

  // Build permission.skill from agent-skills.json
  const skillPermission = buildSkillPermission(manifest, skillName, agentSkills);

  const agent: OpenCodeAgent = {
    name: agentName,
    frontmatter: {
      description: manifest.title || parsed.frontmatter.description || manifest.displayName,
      mode: 'subagent',
      permission: {
        skill: skillPermission
      }
    },
    systemPrompt: createAgentSystemPrompt(manifest, skillName, agentSkills)
  };

  const skill: OpenCodeSkill = {
    name: skillName,
    frontmatter: {
      name: skillName,
      description: manifest.title || parsed.frontmatter.description || manifest.displayName
    },
    content: parsed.content
  };

  return { agent, skill };
}

/**
 * Build specific skill permissions for an agent.
 *
 * 1. Always allow the agent's own persona skill
 * 2. Allow each workflow listed in agent-skills.json (by exact skill name)
 * 3. Allow each task listed in agent-skills.json (by exact skill name)
 *
 * Falls back to wildcard if the agent is not found in agent-skills.json.
 */
function buildSkillPermission(
  manifest: BMADAgentManifestRow,
  ownSkillName: string,
  agentSkills: AgentSkillsMap
): Record<string, 'allow' | 'deny' | 'ask'> {
  const entry = agentSkills[manifest.name];

  if (!entry) {
    // Agent not in agent-skills.json — fallback to module wildcard
    return { [`bmad-${manifest.module}-*`]: 'allow' as const };
  }

  const permission: Record<string, 'allow' | 'deny' | 'ask'> = {};

  // 1. Agent's own persona skill
  permission[ownSkillName] = 'allow';

  // 2. Workflow skills
  for (const workflow of entry.workflows) {
    const name = toSkillName(entry.module, workflow);
    permission[name] = 'allow';
  }

  // 3. Task skills
  if (entry.tasks) {
    for (const task of entry.tasks) {
      const name = toSkillName(entry.module, task);
      permission[name] = 'allow';
    }
  }

  return permission;
}

function createAgentName(manifest: BMADAgentManifestRow): string {
  if (manifest.module === 'core') {
    return `bmad-${manifest.name}`;
  }
  return `${manifest.module}-${manifest.name}`;
}

function createSkillName(manifest: BMADAgentManifestRow): string {
  if (manifest.module === 'core') {
    return `bmad-${manifest.name}`;
  }
  return `bmad-${manifest.module}-${manifest.name}`;
}

function createAgentSystemPrompt(
  manifest: BMADAgentManifestRow,
  skillName: string,
  agentSkills: AgentSkillsMap
): string {
  const role = manifest.role || manifest.displayName;
  const entry = agentSkills[manifest.name];

  const lines: string[] = [
    `You are ${role}.`,
    '',
    `Load the skill "${skillName}" for your full instructions, persona, and available commands.`
  ];

  // List allowed workflows/tasks so the agent knows what it can run
  if (entry) {
    const allowed = [
      ...entry.workflows,
      ...(entry.tasks || [])
    ];
    if (allowed.length > 0) {
      lines.push('');
      lines.push('You have access to the following workflows and tasks:');
      for (const item of allowed) {
        lines.push(`- ${item}`);
      }
    }
  }

  return lines.join('\n');
}
