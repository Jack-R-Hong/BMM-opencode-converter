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
import type { OpenCodeConversionResult, OpenCodeAgent, OpenCodeSkill } from './types/index.js';
import { parseAgentManifest, parseWorkflowManifest, parseTaskManifest } from './parsers/index.js';
import { parseAgent } from './parsers/agent-parser.js';
import { parseWorkflow } from './parsers/workflow-parser.js';
import { convertAgents } from './converters/agent-converter.js';
import { convertWorkflows } from './converters/workflow-converter.js';
import { convertTasks } from './converters/task-converter.js';

export interface ConversionOptions {
  sourceDir: string;
  outputDir: string;
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

function writeAgent(outputDir: string, agent: OpenCodeAgent): void {
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

function writeSkill(outputDir: string, skill: OpenCodeSkill): void {
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

export async function convert(options: ConversionOptions): Promise<OpenCodeConversionResult> {
  const { sourceDir, outputDir, verbose = false } = options;
  
  const result: OpenCodeConversionResult = {
    agents: [],
    skills: [],
    tools: [],
    plugins: [],
    warnings: [],
    errors: [],
  };
  
  if (verbose) console.log('BMAD to OpenCode Converter');
  if (verbose) console.log('========================\n');
  
  const configDir = path.join(sourceDir, '_config');
  
  const agentManifestContent = readFileIfExists(path.join(configDir, 'agent-manifest.csv'));
  const workflowManifestContent = readFileIfExists(path.join(configDir, 'workflow-manifest.csv'));
  const taskManifestContent = readFileIfExists(path.join(configDir, 'task-manifest.csv'));
  
  if (!agentManifestContent && !workflowManifestContent && !taskManifestContent) {
    result.errors.push(`No manifest files found in ${configDir}`);
    return result;
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
  
  if (verbose) console.log('\nConverting to OpenCode format...\n');
  
  const convertedAgents = convertAgents(bmadAgents);
  result.agents = convertedAgents.agents;
  result.skills.push(...convertedAgents.skills);
  
  const convertedWorkflows = convertWorkflows(bmadWorkflows);
  result.skills.push(...convertedWorkflows);
  
  const convertedTasks = convertTasks(bmadTasks);
  result.skills.push(...convertedTasks);
  
  if (verbose) console.log('Writing output files...\n');
  
  fs.mkdirSync(outputDir, { recursive: true });
  
  for (const agent of result.agents) {
    writeAgent(outputDir, agent);
    if (verbose) console.log(`  Created agent: ${agent.filename}`);
  }
  
  for (const skill of result.skills) {
    writeSkill(outputDir, skill);
    if (verbose) console.log(`  Created skill: ${skill.folder}/SKILL.md`);
  }
  
  if (verbose) {
    console.log('\nConversion complete!');
    console.log(`  Agents: ${result.agents.length}`);
    console.log(`  Skills: ${result.skills.length}`);
    console.log(`  Tools: ${result.tools.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);
    console.log(`  Errors: ${result.errors.length}`);
  }
  
  return result;
}
