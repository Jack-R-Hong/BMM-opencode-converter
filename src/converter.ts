import * as path from 'path';
import * as fs from 'fs/promises';
import { parseManifests } from './parsers/manifest-parser.js';
import { convertAgent } from './converters/agent-converter.js';
import { convertWorkflow } from './converters/workflow-converter.js';
import { convertTask } from './converters/task-converter.js';
import { writeAgents, writeSkills } from './writers/handlebars-writer.js';
import type { OpenCodeAgent, OpenCodeSkill, ConversionTarget, ConversionResult } from './types/opencode.js';

export type { ConversionTarget };

export interface ConvertOptions {
  sourceDir: string;
  outputDir: string;
  target: ConversionTarget;
  verbose?: boolean;
}

export async function convert(options: ConvertOptions): Promise<ConversionResult> {
  const { sourceDir, outputDir, target, verbose = false } = options;
  
  const log = (msg: string) => {
    if (verbose) {
      console.log(msg);
    }
  };
  
  const errors: string[] = [];
  const agents: OpenCodeAgent[] = [];
  const skills: OpenCodeSkill[] = [];
  
  try {
    log('Parsing manifests...');
    const manifests = await parseManifests(sourceDir);
    
    log(`Found ${manifests.agents.length} agents, ${manifests.workflows.length} workflows, ${manifests.tasks.length} tasks`);
    
    log('\nConverting agents...');
    for (const agentRow of manifests.agents) {
      try {
        const result = await convertAgent(agentRow, sourceDir);
        
        agents.push(result.agent);
        skills.push(result.skill);
        
        log(`  ✓ ${agentRow.module}/${agentRow.name} → ${result.agent.name} + skill:${result.skill.name}`);
      } catch (err) {
        const msg = `Failed to convert agent ${agentRow.name}: ${err}`;
        errors.push(msg);
        log(`  ✗ ${msg}`);
      }
    }
    
    log('\nConverting workflows...');
    for (const workflowRow of manifests.workflows) {
      try {
        const skill = await convertWorkflow(workflowRow, sourceDir);
        
        skills.push(skill);
        
        log(`  ✓ ${workflowRow.module}/${workflowRow.name} → skill:${skill.name}`);
      } catch (err) {
        const msg = `Failed to convert workflow ${workflowRow.name}: ${err}`;
        errors.push(msg);
        log(`  ✗ ${msg}`);
      }
    }
    
    log('\nConverting tasks...');
    for (const taskRow of manifests.tasks) {
      try {
        const skill = await convertTask(taskRow, sourceDir);
        
        skills.push(skill);
        
        log(`  ✓ ${taskRow.module}/${taskRow.name} → skill:${skill.name}`);
      } catch (err) {
        const msg = `Failed to convert task ${taskRow.name}: ${err}`;
        errors.push(msg);
        log(`  ✗ ${msg}`);
      }
    }
    
    log('\nWriting output files...');
    await writeAgents(agents, outputDir, target);
    await writeSkills(skills, outputDir, target);
    
    log(`\nConversion complete!`);
    log(`  Agents: ${agents.length}`);
    log(`  Skills: ${skills.length}`);
    log(`  Errors: ${errors.length}`);
    
    return {
      agents,
      skills,
      agentCount: agents.length,
      skillCount: skills.length,
      errors
    };
    
  } catch (err) {
    const msg = `Conversion failed: ${err}`;
    errors.push(msg);
    throw new Error(msg);
  }
}
