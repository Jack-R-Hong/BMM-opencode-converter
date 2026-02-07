import type { BmadAgent, BmadWorkflow, BmadTask } from '../types/bmad.js';

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

/**
 * Build a lookup from workflow/task file paths → converted skill names.
 * Menu items reference files by path; we need to resolve those to actual skill names.
 */
function buildPathToSkillNameLookup(
  workflows: BmadWorkflow[],
  tasks: BmadTask[],
): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const wf of workflows) {
    const skillName = `bmad-${wf.module}-${toKebabCase(wf.name)}`;
    lookup.set(wf.path, skillName);
    lookup.set(wf.name, skillName);
  }

  for (const task of tasks) {
    const taskName = toKebabCase(task.name);
    const skillName = taskName.startsWith('task-')
      ? `bmad-${task.module}-${taskName}`
      : `bmad-${task.module}-task-${taskName}`;
    lookup.set(task.path, skillName);
    lookup.set(task.name, skillName);
  }

  return lookup;
}

/**
 * Resolve a menu item's workflow/exec reference to a skill name.
 * Tries exact path match first, then falls back to name extraction from path.
 */
function resolveMenuItemToSkillName(
  ref: string,
  pathLookup: Map<string, string>,
): string | null {
  // Direct lookup by full path
  const direct = pathLookup.get(ref);
  if (direct) return direct;

  // Normalize: strip {project-root}/ prefix
  const normalized = ref.replace(/^\{project-root\}\//, '');
  const normalizedMatch = pathLookup.get(normalized);
  if (normalizedMatch) return normalizedMatch;

  // Extract workflow dir name from path: .../_bmad/{module}/workflows/{...}/{name}/workflow*.{md,yaml}
  const workflowMatch = ref.match(
    /\/_bmad\/[^/]+\/workflows\/.*\/([^/]+)\/workflow[^/]*\.(md|yaml)$/,
  );
  if (workflowMatch) {
    const name = workflowMatch[1];
    for (const [key, skillName] of pathLookup) {
      if (key === name || toKebabCase(key) === toKebabCase(name)) {
        return skillName;
      }
    }
  }

  // Extract task name from path: .../_bmad/{module}/tasks/{name}.{md,yaml}
  const taskMatch = ref.match(/\/_bmad\/[^/]+\/tasks\/([^/]+)\.(md|yaml)$/);
  if (taskMatch) {
    const name = taskMatch[1];
    for (const [key, skillName] of pathLookup) {
      if (key === name || toKebabCase(key) === toKebabCase(name)) {
        return skillName;
      }
    }
  }

  // Last resort: match by basename without extension
  const basename = ref.replace(/^.*\//, '').replace(/\.(md|yaml)$/, '');
  for (const [key, skillName] of pathLookup) {
    if (toKebabCase(key) === toKebabCase(basename)) {
      return skillName;
    }
  }

  return null;
}

export interface AgentSkillOwnership {
  agentSkillName: string;
  ownedSkills: string[];
}

/**
 * Build the ownership map from agents' menu items, resolving workflow/exec paths
 * to actual converted skill names using the loaded workflows and tasks.
 */
export function buildOwnershipMap(
  agents: BmadAgent[],
  workflows: BmadWorkflow[],
  tasks: BmadTask[],
): Map<string, AgentSkillOwnership> {
  const pathLookup = buildPathToSkillNameLookup(workflows, tasks);
  const map = new Map<string, AgentSkillOwnership>();

  for (const agent of agents) {
    const cleanId = cleanAgentId(agent.id);
    const agentSkillName = toKebabCase(`bmad-${agent.module}-${cleanId}`);
    const ownedSkills: string[] = [];

    for (const item of agent.menu) {
      const ref = item.workflow || item.exec;
      if (!ref) continue;

      const skillName = resolveMenuItemToSkillName(ref, pathLookup);
      if (skillName && !ownedSkills.includes(skillName)) {
        ownedSkills.push(skillName);
      }
    }

    map.set(agentSkillName, { agentSkillName, ownedSkills });
  }

  return map;
}

export function getSkillOwners(
  ownershipMap: Map<string, AgentSkillOwnership>,
  skillName: string,
): string[] {
  const owners: string[] = [];
  for (const [_agentName, ownership] of ownershipMap) {
    if (ownership.ownedSkills.includes(skillName)) {
      owners.push(ownership.agentSkillName);
    }
  }
  return owners;
}
