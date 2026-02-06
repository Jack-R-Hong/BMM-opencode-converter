import type { BmadWorkflow, BmadWorkflowConfig, BmadWorkflowStep } from '../types/index.js';
import { parseWorkflowConfig } from './yaml-parser.js';

function parseWorkflowSteps(instructions: string): BmadWorkflowStep[] {
  const steps: BmadWorkflowStep[] = [];
  const stepPattern = /<step\s+n="(\d+)"\s+goal="([^"]*)">([\s\S]*?)<\/step>/g;
  
  let match;
  while ((match = stepPattern.exec(instructions)) !== null) {
    const [, n, goal, content] = match;
    
    const actions: string[] = [];
    const actionMatches = content.matchAll(/<action>([\s\S]*?)<\/action>/g);
    for (const am of actionMatches) {
      actions.push(am[1].trim());
    }
    
    const asks: string[] = [];
    const askMatches = content.matchAll(/<ask[^>]*>([\s\S]*?)<\/ask>/g);
    for (const am of askMatches) {
      asks.push(am[1].trim());
    }
    
    const checks: string[] = [];
    const checkMatches = content.matchAll(/<check[^>]*>([\s\S]*?)<\/check>/g);
    for (const cm of checkMatches) {
      checks.push(cm[1].trim());
    }
    
    const templateOutputs: string[] = [];
    const toMatches = content.matchAll(/<template-output>([\s\S]*?)<\/template-output>/g);
    for (const tm of toMatches) {
      templateOutputs.push(tm[1].trim());
    }
    
    steps.push({
      n: parseInt(n, 10),
      goal,
      actions,
      asks,
      checks,
      templateOutputs,
    });
  }
  
  return steps;
}

function parseMarkdownWorkflowFrontmatter(content: string): { config: Partial<BmadWorkflowConfig>; body: string } {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) {
    return { config: {}, body: content };
  }

  const config: Partial<BmadWorkflowConfig> = {};
  const fmLines = fmMatch[1].split('\n');
  
  for (const line of fmLines) {
    const match = line.match(/^(\w+):\s*['"]?([^'"]*?)['"]?\s*$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'name') config.name = value;
      if (key === 'description') config.description = value;
    }
  }

  return { config, body: fmMatch[2] };
}

export function parseWorkflow(
  configContent: string,
  instructionsContent: string | null,
  templateContent: string | null,
  module: string,
  path: string,
  isYaml: boolean
): BmadWorkflow {
  let config: BmadWorkflowConfig;
  let instructions: string;
  
  if (isYaml) {
    config = parseWorkflowConfig(configContent);
    instructions = instructionsContent || '';
  } else {
    const parsed = parseMarkdownWorkflowFrontmatter(configContent);
    config = {
      name: parsed.config.name || '',
      description: parsed.config.description || '',
      standalone: false,
      variables: {},
      dataFiles: {},
    };
    instructions = parsed.body;
  }

  const instructionSteps = parseWorkflowSteps(instructions);

  return {
    name: config.name,
    module,
    path,
    config,
    instructions,
    instructionSteps,
    template: templateContent || undefined,
    supportingFiles: {},
  };
}
