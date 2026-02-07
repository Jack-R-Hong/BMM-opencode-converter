import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  BmadAgent,
  BmadWorkflow,
  BmadTask,
  BmadAgentManifestEntry,
  BmadWorkflowManifestEntry,
  BmadTaskManifestEntry,
} from './types/index.js';
import type { OpenCodeConversionResult } from './types/index.js';
import type { ClaudeCodeConversionResult } from './types/claude.js';
import { parseAgentManifest, parseWorkflowManifest, parseTaskManifest } from './parsers/index.js';
import { parseAgent } from './parsers/agent-parser.js';
import { parseWorkflow } from './parsers/workflow-parser.js';
import { convertAgents } from './converters/agent-converter.js';
import { convertWorkflows } from './converters/workflow-converter.js';
import { convertTasks } from './converters/task-converter.js';
import { convertClaudeAgents } from './converters/claude/claude-agent-converter.js';
import { convertClaudeWorkflows } from './converters/claude/claude-workflow-converter.js';
import { convertClaudeTasks } from './converters/claude/claude-task-converter.js';
import { buildOwnershipMap } from './converters/ownership.js';
import { writeOpenCodeAgent, writeOpenCodeSkill } from './writers/opencode-writer.js';
import { writeClaudeAgent, writeClaudeSkill } from './writers/claude-writer.js';
import { writeAgentsAgent, writeAgentsSkill } from './writers/agents-writer.js';

export type ConversionTarget = 'opencode' | 'claude' | 'agents';

export interface ConversionOptions {
  sourceDir: string;
  outputDir: string;
  target?: ConversionTarget;
  verbose?: boolean;
}

function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function normalizeManifestPath(manifestPath: string): string {
  return manifestPath.replace(/^_bmad\//, '');
}

function loadAgents(
  sourceDir: string,
  agentManifest: BmadAgentManifestEntry[],
  verbose: boolean
): BmadAgent[] {
  const agents: BmadAgent[] = [];
  
  for (const entry of agentManifest) {
    const normalizedPath = normalizeManifestPath(entry.path);
    const agentPath = path.join(sourceDir, normalizedPath);
    const content = readFileIfExists(agentPath);
    
    if (!content) {
      if (verbose) console.log(`  Skipping agent ${entry.name}: file not found at ${agentPath}`);
      continue;
    }
    
    try {
      const agent = parseAgent(content, entry.module, entry.path);
      agents.push(agent);
      if (verbose) console.log(`  Loaded agent: ${entry.name} (${entry.module})`);
    } catch (err) {
      if (verbose) console.log(`  Error parsing agent ${entry.name}: ${err}`);
    }
  }
  
  return agents;
}

function loadWorkflows(
  sourceDir: string,
  workflowManifest: BmadWorkflowManifestEntry[],
  verbose: boolean
): BmadWorkflow[] {
  const workflows: BmadWorkflow[] = [];
  
  for (const entry of workflowManifest) {
    const normalizedPath = normalizeManifestPath(entry.path);
    const workflowPath = path.join(sourceDir, normalizedPath);
    const isYaml = workflowPath.endsWith('.yaml') || workflowPath.endsWith('.yml');
    const configContent = readFileIfExists(workflowPath);
    
    if (!configContent) {
      if (verbose) console.log(`  Skipping workflow ${entry.name}: file not found at ${workflowPath}`);
      continue;
    }
    
    let instructionsContent: string | null = null;
    let templateContent: string | null = null;
    
    if (isYaml) {
      const workflowDir = path.dirname(workflowPath);
      instructionsContent = readFileIfExists(path.join(workflowDir, 'instructions.md'));
      templateContent = readFileIfExists(path.join(workflowDir, 'template.md'));
    }
    
    try {
      const workflow = parseWorkflow(
        configContent,
        instructionsContent,
        templateContent,
        entry.module,
        entry.path,
        isYaml
      );
      workflows.push(workflow);
      if (verbose) console.log(`  Loaded workflow: ${entry.name} (${entry.module})`);
    } catch (err) {
      if (verbose) console.log(`  Error parsing workflow ${entry.name}: ${err}`);
    }
  }
  
  return workflows;
}

function loadTasks(
  sourceDir: string,
  taskManifest: BmadTaskManifestEntry[],
  verbose: boolean
): BmadTask[] {
  const tasks: BmadTask[] = [];
  
  for (const entry of taskManifest) {
    const normalizedPath = normalizeManifestPath(entry.path);
    const taskPath = path.join(sourceDir, normalizedPath);
    const content = readFileIfExists(taskPath);
    
    if (!content) {
      if (verbose) console.log(`  Skipping task ${entry.name}: file not found at ${taskPath}`);
      continue;
    }
    
    const isXml = taskPath.endsWith('.xml');
    
    tasks.push({
      name: entry.name,
      displayName: entry.displayName,
      description: entry.description,
      module: entry.module,
      path: entry.path,
      standalone: entry.standalone === 'true',
      content,
      isXml,
    });
    
    if (verbose) console.log(`  Loaded task: ${entry.name} (${entry.module})`);
  }
  
  return tasks;
}

function convertAndWriteOpenCode(
  bmadAgents: BmadAgent[],
  bmadWorkflows: BmadWorkflow[],
  bmadTasks: BmadTask[],
  outputDir: string,
  verbose: boolean,
): OpenCodeConversionResult {
  const result: OpenCodeConversionResult = {
    agents: [],
    skills: [],
    tools: [],
    plugins: [],
    warnings: [],
    errors: [],
  };

  const convertedAgents = convertAgents(bmadAgents);
  result.agents = convertedAgents.agents;
  result.skills.push(...convertedAgents.skills);
  result.skills.push(...convertWorkflows(bmadWorkflows));
  result.skills.push(...convertTasks(bmadTasks));

  fs.mkdirSync(outputDir, { recursive: true });

  for (const agent of result.agents) {
    writeOpenCodeAgent(outputDir, agent);
    if (verbose) console.log(`  Created agent: ${agent.filename}`);
  }
  for (const skill of result.skills) {
    writeOpenCodeSkill(outputDir, skill);
    if (verbose) console.log(`  Created skill: ${skill.folder}/SKILL.md`);
  }

  return result;
}

function convertAndWriteClaude(
  bmadAgents: BmadAgent[],
  bmadWorkflows: BmadWorkflow[],
  bmadTasks: BmadTask[],
  outputDir: string,
  verbose: boolean,
): ClaudeCodeConversionResult {
  const result: ClaudeCodeConversionResult = {
    agents: [],
    skills: [],
    warnings: [],
    errors: [],
  };

  const ownershipMap = buildOwnershipMap(bmadAgents, bmadWorkflows, bmadTasks);

  const convertedAgents = convertClaudeAgents(bmadAgents, ownershipMap);
  result.agents = convertedAgents.agents;
  result.skills.push(...convertedAgents.skills);
  result.skills.push(...convertClaudeWorkflows(bmadWorkflows));
  result.skills.push(...convertClaudeTasks(bmadTasks));

  fs.mkdirSync(outputDir, { recursive: true });

  for (const agent of result.agents) {
    writeClaudeAgent(outputDir, agent);
    if (verbose) console.log(`  Created agent: ${agent.filename}`);
  }
  for (const skill of result.skills) {
    writeClaudeSkill(outputDir, skill);
    if (verbose) console.log(`  Created skill: ${skill.folder}/SKILL.md`);
  }

  return result;
}

function convertAndWriteAgents(
  bmadAgents: BmadAgent[],
  bmadWorkflows: BmadWorkflow[],
  bmadTasks: BmadTask[],
  outputDir: string,
  verbose: boolean,
): OpenCodeConversionResult {
  const result: OpenCodeConversionResult = {
    agents: [],
    skills: [],
    tools: [],
    plugins: [],
    warnings: [],
    errors: [],
  };

  const convertedAgents = convertAgents(bmadAgents);
  result.agents = convertedAgents.agents;
  result.skills.push(...convertedAgents.skills);
  result.skills.push(...convertWorkflows(bmadWorkflows));
  result.skills.push(...convertTasks(bmadTasks));

  fs.mkdirSync(outputDir, { recursive: true });

  for (const agent of result.agents) {
    writeAgentsAgent(outputDir, agent);
    if (verbose) console.log(`  Created agent: ${agent.filename}`);
  }
  for (const skill of result.skills) {
    writeAgentsSkill(outputDir, skill);
    if (verbose) console.log(`  Created skill: ${skill.folder}/SKILL.md`);
  }

  return result;
}

export interface ConversionResultSummary {
  agentCount: number;
  skillCount: number;
  warnings: string[];
  errors: string[];
}

export async function convert(options: ConversionOptions): Promise<ConversionResultSummary> {
  const { sourceDir, outputDir, target = 'opencode', verbose = false } = options;

  if (verbose) console.log(`BMAD to ${target} Converter`);
  if (verbose) console.log('========================\n');

  const configDir = path.join(sourceDir, '_config');

  const agentManifestContent = readFileIfExists(path.join(configDir, 'agent-manifest.csv'));
  const workflowManifestContent = readFileIfExists(path.join(configDir, 'workflow-manifest.csv'));
  const taskManifestContent = readFileIfExists(path.join(configDir, 'task-manifest.csv'));

  if (!agentManifestContent && !workflowManifestContent && !taskManifestContent) {
    return { agentCount: 0, skillCount: 0, warnings: [], errors: [`No manifest files found in ${configDir}`] };
  }

  if (verbose) console.log('Loading BMAD assets...\n');

  const agentManifest = agentManifestContent ? parseAgentManifest(agentManifestContent) : [];
  const workflowManifest = workflowManifestContent ? parseWorkflowManifest(workflowManifestContent) : [];
  const taskManifest = taskManifestContent ? parseTaskManifest(taskManifestContent) : [];

  if (verbose) console.log(`Found ${agentManifest.length} agents, ${workflowManifest.length} workflows, ${taskManifest.length} tasks\n`);

  if (verbose) console.log('Loading agents...');
  const bmadAgents = loadAgents(sourceDir, agentManifest, verbose);

  if (verbose) console.log('\nLoading workflows...');
  const bmadWorkflows = loadWorkflows(sourceDir, workflowManifest, verbose);

  if (verbose) console.log('\nLoading tasks...');
  const bmadTasks = loadTasks(sourceDir, taskManifest, verbose);

  if (verbose) console.log(`\nConverting to ${target} format...\n`);
  if (verbose) console.log('Writing output files...\n');

  let agentCount = 0;
  let skillCount = 0;
  let warnings: string[] = [];
  let errors: string[] = [];

  switch (target) {
    case 'opencode': {
      const r = convertAndWriteOpenCode(bmadAgents, bmadWorkflows, bmadTasks, outputDir, verbose);
      agentCount = r.agents.length;
      skillCount = r.skills.length;
      warnings = r.warnings;
      errors = r.errors;
      break;
    }
    case 'claude': {
      const r = convertAndWriteClaude(bmadAgents, bmadWorkflows, bmadTasks, outputDir, verbose);
      agentCount = r.agents.length;
      skillCount = r.skills.length;
      warnings = r.warnings;
      errors = r.errors;
      break;
    }
    case 'agents': {
      const r = convertAndWriteAgents(bmadAgents, bmadWorkflows, bmadTasks, outputDir, verbose);
      agentCount = r.agents.length;
      skillCount = r.skills.length;
      warnings = r.warnings;
      errors = r.errors;
      break;
    }
  }

  if (verbose) {
    console.log('\nConversion complete!');
    console.log(`  Agents: ${agentCount}`);
    console.log(`  Skills: ${skillCount}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Errors: ${errors.length}`);
  }

  return { agentCount, skillCount, warnings, errors };
}
