import * as path from 'path';
import { parseMarkdown } from '../parsers/markdown-parser.js';
import type { BMADAgentManifestRow, BMADAgentFile } from '../types/bmad.js';
import type { OpenCodeAgent, OpenCodeSkill } from '../types/opencode.js';

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
  
  const agent: OpenCodeAgent = {
    name: agentName,
    frontmatter: {
      description: manifest.title || parsed.frontmatter.description || manifest.displayName,
      mode: 'subagent',
      permission: {
        skill: {
          [`bmad-${manifest.module}-*`]: 'allow'
        }
      }
    },
    systemPrompt: createAgentSystemPrompt(manifest, skillName)
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

function createAgentSystemPrompt(manifest: BMADAgentManifestRow, skillName: string): string {
  const role = manifest.role || manifest.displayName;
  
  return `You are ${role}.

Load the skill "${skillName}" for your full instructions, persona, and available commands.`;
}
