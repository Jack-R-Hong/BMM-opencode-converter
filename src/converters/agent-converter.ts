import * as path from 'path';
import { parseMarkdown } from '../parsers/markdown-parser.js';
import type { BMADAgentManifestRow } from '../types/bmad.js';
import type { OpenCodeAgent, OpenCodeSkill } from '../types/opencode.js';

/**
 * Build the specific skill name for a workflow or task, following the
 * naming convention used by workflow-converter and task-converter:
 *   core module  → bmad-{name}
 *   other module → bmad-{module}-{name}
 */
function toSkillName(module: string, name: string): string {
  return module === 'core' ? `bmad-${name}` : `bmad-${module}-${name}`;
}

/**
 * Extract the module and workflow/task name from a menu item exec/workflow path.
 *
 * Paths follow the pattern:
 *   {project-root}/_bmad/{module}/workflows/{...}/{name}/workflow.{md|yaml}
 *   {project-root}/_bmad/{module}/workflows/{...}/workflow-{name}.md
 *   {project-root}/_bmad/{module}/tasks/{name}.{md|xml}
 *
 * Returns null if the path cannot be parsed.
 */
function parseExecPath(execPath: string): { module: string; name: string } | null {
  // Strip {project-root}/_bmad/ prefix
  const match = execPath.match(/\/_bmad\/([^/]+)\/(workflows|tasks)\/(.+)$/);
  if (!match) return null;

  const module = match[1];
  const category = match[2]; // 'workflows' or 'tasks'
  const rest = match[3]; // everything after workflows/ or tasks/

  if (category === 'tasks') {
    // tasks/{name}.md or tasks/{name}.xml
    const taskName = rest.replace(/\.[^.]+$/, '');
    return { module, name: taskName };
  }

  // For workflows, extract meaningful name from path
  const filename = path.basename(rest);

  // Pattern: workflow-{name}.md  (e.g. workflow-market-research.md)
  const dashMatch = filename.match(/^workflow-(.+)\.[^.]+$/);
  if (dashMatch) {
    return { module, name: dashMatch[1] };
  }

  // Pattern: workflow.{md|yaml} in a named directory
  // e.g. brainstorming/workflow.md → name = brainstorming
  //      1-analysis/create-product-brief/workflow.md → name = create-product-brief
  //      document-project/workflow.yaml → name = document-project
  if (/^workflow\.[^.]+$/.test(filename)) {
    const dir = path.basename(path.dirname(rest));
    return { module, name: dir };
  }

  return null;
}

function extractMenuExecPaths(content: string): string[] {
  const paths: string[] = [];
  const regex = /(?:exec|workflow)="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    paths.push(m[1]);
  }
  return paths;
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

  const agentName = createAgentName(manifest);
  const skillName = createSkillName(manifest);

  const referencedSkillNames = extractReferencedSkillNames(parsed.content);
  const skillPermission = buildSkillPermission(skillName, referencedSkillNames);

  const agent: OpenCodeAgent = {
    name: agentName,
    frontmatter: {
      description: manifest.title || parsed.frontmatter.description || manifest.displayName,
      mode: 'subagent',
      permission: {
        skill: skillPermission
      }
    },
    systemPrompt: createAgentSystemPrompt(manifest, skillName, referencedSkillNames)
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

function extractReferencedSkillNames(content: string): string[] {
  const execPaths = extractMenuExecPaths(content);
  const seen = new Set<string>();
  const skillNames: string[] = [];

  for (const execPath of execPaths) {
    const parsed = parseExecPath(execPath);
    if (!parsed) continue;
    const name = toSkillName(parsed.module, parsed.name);
    if (!seen.has(name)) {
      seen.add(name);
      skillNames.push(name);
    }
  }

  return skillNames;
}

function buildSkillPermission(
  ownSkillName: string,
  referencedSkillNames: string[]
): Record<string, 'allow' | 'deny' | 'ask'> {
  const permission: Record<string, 'allow' | 'deny' | 'ask'> = {};

  permission[ownSkillName] = 'allow';

  for (const name of referencedSkillNames) {
    permission[name] = 'allow';
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
  referencedSkillNames: string[]
): string {
  const role = manifest.role || manifest.displayName;

  const lines: string[] = [
    `You are ${role}.`,
    '',
    `Load the skill "${skillName}" for your full instructions, persona, and available commands.`
  ];

  // List allowed workflows/tasks so the agent knows what it can run
  if (referencedSkillNames.length > 0) {
    lines.push('');
    lines.push('You have access to the following workflows and tasks:');
    for (const name of referencedSkillNames) {
      lines.push(`- ${name}`);
    }
  }

  return lines.join('\n');
}
